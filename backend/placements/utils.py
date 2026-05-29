from django.utils import timezone
from rest_framework import serializers

from accounts.models import Role, Supervisor, User
from notifications.models import Notification


def resolve_workplace_supervisor(email, organization=None):
    cleaned_email = (email or '').strip().lower()
    if not cleaned_email:
        raise serializers.ValidationError({'workplace_supervisor_email': 'Workplace supervisor email is required.'})

    supervisor = Supervisor.objects.filter(
        user__email__iexact=cleaned_email,
        supervisor_type='workplace',
    ).select_related('user').first()

    if supervisor:
        if organization and supervisor.organization_id != organization.organization_id:
            supervisor.organization = organization
            supervisor.save(update_fields=['organization'])
        return supervisor

    existing_user = User.objects.filter(email__iexact=cleaned_email).select_related('role').first()
    workplace_role, _ = Role.objects.get_or_create(role_name='Workplace Supervisor')

    if existing_user is None:
        local_part = cleaned_email.split('@')[0] or 'supervisor'
        name_parts = [part for part in local_part.replace('.', ' ').replace('_', ' ').split(' ') if part]
        first_name = (name_parts[0] if name_parts else 'Workplace').title()
        last_name = ' '.join(part.title() for part in name_parts[1:]) or 'Supervisor'
        existing_user = User.objects.create(
            email=cleaned_email,
            first_name=first_name,
            last_name=last_name,
            role=workplace_role,
        )
        existing_user.set_unusable_password()
        existing_user.save(update_fields=['password'])
    elif existing_user.role_id != workplace_role.role_id:
        raise serializers.ValidationError({
            'workplace_supervisor_email': 'That email belongs to a non-workplace account. Use a workplace supervisor email.'
        })

    supervisor, _ = Supervisor.objects.get_or_create(
        user=existing_user,
        defaults={
            'supervisor_type': 'workplace',
            'organization': organization,
        },
    )
    if supervisor.supervisor_type != 'workplace':
        supervisor.supervisor_type = 'workplace'
    if organization and supervisor.organization_id != organization.organization_id:
        supervisor.organization = organization
    supervisor.save()
    return supervisor


def _notification_targets(placement):
    targets = []
    if placement.student_id and placement.student.user_id:
        targets.append(placement.student.user)
    if placement.workplace_supervisor_id and placement.workplace_supervisor.user_id:
        targets.append(placement.workplace_supervisor.user)
    if placement.academic_supervisor_id and placement.academic_supervisor.user_id:
        targets.append(placement.academic_supervisor.user)

    unique_targets = []
    seen_ids = set()
    for user in targets:
        if user and user.user_id not in seen_ids:
            seen_ids.add(user.user_id)
            unique_targets.append(user)
    return unique_targets


def create_placement_notifications(placement, event, *, document_name=None):
    details = {
        'placement_id': str(placement.placement_id),
        'organization_id': str(placement.organization_id),
        'organization_name': placement.organization.name if placement.organization_id else '',
        'position_title': placement.position_title,
        'status': placement.status,
        'is_submitted': placement.is_submitted,
        'submitted_at': placement.submitted_at.isoformat() if placement.submitted_at else None,
        'workplace_supervisor_email': placement.workplace_supervisor_email,
        'document_name': document_name,
    }

    if event == 'submitted':
        message = f'Your placement for {placement.position_title} has been submitted and locked for review.'
        notification_type = 'placement_submitted'
    elif event == 'letter_deleted':
        message = f'Your uploaded placement letter for {placement.position_title} was deleted. The placement is editable again.'
        notification_type = 'placement_letter_deleted'
    else:
        message = f'Placement update for {placement.position_title}.'
        notification_type = 'placement_submitted'

    for user in _notification_targets(placement):
        user_message = message
        if placement.workplace_supervisor_id and user.user_id == placement.workplace_supervisor.user.user_id:
            user_message = (
                f'A student has submitted a placement letter for {placement.position_title} at '
                f'{placement.organization.name if placement.organization_id else "the organization"}.'
            )
        Notification.objects.create(
            user=user,
            message=user_message,
            notification_type=notification_type,
            details=details,
        )


def finalize_placement_submission(placement, *, document_name=None):
    placement.is_submitted = True
    placement.submitted_at = timezone.now()
    placement.save(update_fields=['is_submitted', 'submitted_at'])
    create_placement_notifications(placement, 'submitted', document_name=document_name)


def unlock_placement_submission(placement):
    placement.is_submitted = False
    placement.submitted_at = None
    placement.save(update_fields=['is_submitted', 'submitted_at'])
    create_placement_notifications(placement, 'letter_deleted')