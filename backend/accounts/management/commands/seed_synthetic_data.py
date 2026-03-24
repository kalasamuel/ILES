import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import Department, Role, Student, Supervisor, User
from dashboards.models import DashboardMetric
from evaluations.models import Evaluation, EvaluationCriteria, EvaluationScore, ScoreBreakdown
from logbooks.models import LogAttachment, WeeklyLog
from notifications.models import Deadline, Notification
from organizations.models import Organization
from placements.models import InternshipPlacement, PlacementDocument
from reviews.models import LogReview, WorkflowHistory


class Command(BaseCommand):
    help = "Populate the database with synthetic data for frontend testing"

    @staticmethod
    def _create_synthetic_user(*, email, first_name, last_name, role, phone_number, department):
        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            role=role,
            phone_number=phone_number,
            department=department,
        )
        user.set_unusable_password()
        user.save()
        return user

    def add_arguments(self, parser):
        parser.add_argument(
            "--students",
            type=int,
            default=120,
            help="Number of students (and placements) to generate. Default: 120",
        )
        parser.add_argument(
            "--weeks",
            type=int,
            default=4,
            help="Weekly logs per placement. Default: 4",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing synthetic-compatible data before seeding",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        student_count = max(options["students"], 1)
        weeks_per_placement = max(options["weeks"], 1)
        do_reset = options["reset"]

        random.seed(42)
        run_tag = timezone.now().strftime("%Y%m%d%H%M%S")
        now = timezone.now()

        if do_reset:
            self.stdout.write("Resetting existing seeded-compatible records...")
            LogReview.objects.all().delete()
            WorkflowHistory.objects.all().delete()
            EvaluationScore.objects.all().delete()
            Evaluation.objects.all().delete()
            ScoreBreakdown.objects.all().delete()
            LogAttachment.objects.all().delete()
            WeeklyLog.objects.all().delete()
            PlacementDocument.objects.all().delete()
            InternshipPlacement.objects.all().delete()
            Notification.objects.all().delete()
            Deadline.objects.all().delete()
            DashboardMetric.objects.all().delete()
            Student.objects.all().delete()
            Supervisor.objects.all().delete()
            User.objects.filter(is_superuser=False).delete()
            Organization.objects.all().delete()
            Department.objects.all().delete()

        roles = {}
        for role_name in ["Admin", "Student", "Academic Supervisor", "Workplace Supervisor"]:
            role, _ = Role.objects.get_or_create(role_name=role_name)
            roles[role_name] = role

        departments = []
        department_names = [
            "Computer Science",
            "Information Systems",
            "Software Engineering",
            "Data Science",
            "Cybersecurity",
            "Electrical Engineering",
        ]
        for name in department_names:
            dept, _ = Department.objects.get_or_create(
                department_name=name,
                faculty="Faculty of Technology",
                university="Example University",
            )
            departments.append(dept)

        industries = [
            "Software",
            "Finance",
            "Healthcare",
            "Telecommunications",
            "Education",
            "Manufacturing",
            "Consulting",
            "Media",
        ]
        cities = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika"]

        organizations = []
        for index in range(1, 26):
            org = Organization.objects.create(
                name=f"Org {index} {run_tag}",
                industry=random.choice(industries),
                address=f"{100 + index} Innovation Road",
                city=random.choice(cities),
                country="Kenya",
                contact_email=f"contact{index}.{run_tag}@orgexample.com",
                contact_phone=f"+254700{index:04d}",
            )
            organizations.append(org)

        criteria_seed = [
            ("Technical Skills", "Demonstrates technical competence", Decimal("30.00"), Decimal("100.00")),
            ("Communication", "Communicates effectively", Decimal("20.00"), Decimal("100.00")),
            ("Professionalism", "Shows professional conduct", Decimal("20.00"), Decimal("100.00")),
            ("Teamwork", "Collaborates with team members", Decimal("15.00"), Decimal("100.00")),
            ("Problem Solving", "Resolves challenges independently", Decimal("15.00"), Decimal("100.00")),
        ]
        criteria_objects = []
        for name, description, weight, max_score in criteria_seed:
            item, _ = EvaluationCriteria.objects.get_or_create(
                name=name,
                defaults={
                    "description": description,
                    "weight_percentage": weight,
                    "max_score": max_score,
                },
            )
            criteria_objects.append(item)

        first_names = [
            "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Avery", "Riley", "Quinn", "Jamie", "Skyler",
            "Drew", "Parker", "Robin", "Kendall", "Reese", "Kai", "Sam", "Rowan", "Blake", "Charlie",
        ]
        last_names = [
            "Otieno", "Mwangi", "Kariuki", "Njoroge", "Omondi", "Wanjiku", "Achieng", "Kamau", "Mutiso", "Chebet",
            "Kiptoo", "Nyambura", "Gitau", "Wekesa", "Maina", "Okello", "Mutua", "Muthoni", "Ouma", "Barasa",
        ]

        workplace_supervisors = []
        for index in range(1, 51):
            organization = random.choice(organizations)
            user = self._create_synthetic_user(
                email=f"worksup{index}.{run_tag}@iles.test",
                first_name=random.choice(first_names),
                last_name=random.choice(last_names),
                role=roles["Workplace Supervisor"],
                phone_number=f"+254711{index:04d}",
                department=random.choice(departments),
            )
            supervisor = Supervisor.objects.create(
                user=user,
                supervisor_type="workplace",
                organization=organization,
                department=None,
            )
            workplace_supervisors.append(supervisor)

        academic_supervisors = []
        for index in range(1, 21):
            dept = random.choice(departments)
            user = self._create_synthetic_user(
                email=f"acadsup{index}.{run_tag}@iles.test",
                first_name=random.choice(first_names),
                last_name=random.choice(last_names),
                role=roles["Academic Supervisor"],
                phone_number=f"+254722{index:04d}",
                department=dept,
            )
            supervisor = Supervisor.objects.create(
                user=user,
                supervisor_type="academic",
                organization=None,
                department=dept,
            )
            academic_supervisors.append(supervisor)

        students = []
        placements = []
        placement_statuses = ["pending", "approved", "completed", "rejected"]
        placement_weights = [10, 45, 35, 10]

        for index in range(1, student_count + 1):
            dept = random.choice(departments)
            student_user = self._create_synthetic_user(
                email=f"student{index}.{run_tag}@iles.test",
                first_name=random.choice(first_names),
                last_name=random.choice(last_names),
                role=roles["Student"],
                phone_number=f"+254733{index:04d}",
                department=dept,
            )
            student = Student.objects.create(
                user=student_user,
                registration_number=f"REG-{run_tag}-{index:04d}",
                program=dept.department_name,
                year_of_study=random.choice([2, 3, 4]),
                expected_graduation=(now + timedelta(days=random.randint(180, 730))).date(),
            )
            students.append(student)

            org = random.choice(organizations)
            possible_workplace = [sup for sup in workplace_supervisors if sup.organization_id == org.organization_id]
            workplace_supervisor = random.choice(possible_workplace or workplace_supervisors)
            academic_supervisor = random.choice(academic_supervisors)

            start_date = (now - timedelta(days=random.randint(15, 120))).date()
            end_date = start_date + timedelta(days=84)
            status = random.choices(placement_statuses, weights=placement_weights, k=1)[0]

            placement = InternshipPlacement.objects.create(
                student=student,
                organization=org,
                workplace_supervisor=workplace_supervisor,
                academic_supervisor=academic_supervisor,
                start_date=start_date,
                end_date=end_date,
                position_title=random.choice(
                    [
                        "Software Intern",
                        "Data Analyst Intern",
                        "QA Intern",
                        "DevOps Intern",
                        "Product Intern",
                    ]
                ),
                status=status,
            )
            placements.append(placement)

            for doc_type in ["introduction_letter", "acceptance_letter", "contract"]:
                PlacementDocument.objects.create(
                    placement=placement,
                    document_type=doc_type,
                    file_url=f"https://example-files.test/{run_tag}/placements/{placement.placement_id}/{doc_type}.pdf",
                )

            WorkflowHistory.objects.create(
                entity_type="placement",
                entity_id=placement.placement_id,
                previous_status=None,
                new_status=status,
                changed_by=student_user,
            )

        total_logs = 0
        total_reviews = 0
        reviewed_log_statuses = {"submitted", "reviewed", "approved", "rejected"}

        for placement in placements:
            for week_num in range(1, weeks_per_placement + 1):
                week_start = placement.start_date + timedelta(days=(week_num - 1) * 7)
                week_end = week_start + timedelta(days=6)
                log_status = random.choices(
                    ["draft", "submitted", "reviewed", "approved", "rejected"],
                    weights=[10, 35, 20, 25, 10],
                    k=1,
                )[0]
                submitted_at = None if log_status == "draft" else now - timedelta(days=random.randint(0, 20))

                log = WeeklyLog.objects.create(
                    placement=placement,
                    week_number=week_num,
                    start_date=week_start,
                    end_date=week_end,
                    activities_performed="Implemented assigned tasks, attended standups, and documented progress.",
                    skills_learned="API integration, team collaboration, and version control workflows.",
                    challenges="Handling edge cases and managing task deadlines.",
                    solutions="Paired with mentor and broke tasks into smaller milestones.",
                    hours_worked=Decimal(str(random.randint(32, 45))),
                    status=log_status,
                    submitted_at=submitted_at,
                )
                total_logs += 1

                if random.random() < 0.35:
                    LogAttachment.objects.create(
                        log=log,
                        file_url=f"https://example-files.test/{run_tag}/logs/{log.log_id}/weekly-evidence.pdf",
                        description="Weekly evidence attachment",
                    )

                WorkflowHistory.objects.create(
                    entity_type="log",
                    entity_id=log.log_id,
                    previous_status="draft" if log_status != "draft" else None,
                    new_status=log_status,
                    changed_by=placement.student.user,
                )

                if log_status in reviewed_log_statuses:
                    reviewer = random.choice([placement.workplace_supervisor, placement.academic_supervisor])
                    LogReview.objects.create(
                        log=log,
                        supervisor=reviewer,
                        comments="Good progress. Keep improving documentation quality.",
                        rating=Decimal(str(random.choice([3.0, 3.5, 4.0, 4.5, 5.0]))),
                        status=random.choice(["approved", "needs_revision", "rejected"]),
                    )
                    total_reviews += 1

        evaluation_count = 0
        score_breakdown_count = 0
        evaluated_statuses = {"approved", "completed"}

        for placement in placements:
            if placement.status not in evaluated_statuses:
                continue

            evaluator = random.choice([placement.workplace_supervisor, placement.academic_supervisor])
            evaluation = Evaluation.objects.create(
                placement=placement,
                evaluator=evaluator,
                evaluation_date=now.date(),
                comments="Overall solid internship performance.",
            )

            weighted_total = Decimal("0.00")
            for criteria in criteria_objects:
                score_value = Decimal(str(random.randint(60, 98)))
                EvaluationScore.objects.create(
                    evaluation=evaluation,
                    criteria=criteria,
                    score=score_value,
                )
                weighted_total += (score_value / Decimal("100")) * criteria.weight_percentage

            final_score = weighted_total.quantize(Decimal("0.01"))
            if final_score >= Decimal("80"):
                grade = "A"
            elif final_score >= Decimal("70"):
                grade = "B"
            elif final_score >= Decimal("60"):
                grade = "C"
            elif final_score >= Decimal("50"):
                grade = "D"
            else:
                grade = "E"

            evaluation.total_score = final_score
            evaluation.grade = grade
            evaluation.save(update_fields=["total_score", "grade"])
            evaluation_count += 1

            ScoreBreakdown.objects.create(
                placement=placement,
                supervisor_score=final_score,
                academic_score=(final_score - Decimal("2.00")).quantize(Decimal("0.01")),
                logbook_score=(final_score - Decimal("1.00")).quantize(Decimal("0.01")),
                final_score=final_score,
                grade=grade,
            )
            score_breakdown_count += 1

        for student in students:
            Notification.objects.create(
                user=student.user,
                message="Your weekly logbook is due soon.",
                notification_type="submission_deadline",
                is_read=random.choice([True, False]),
            )

        for sup in workplace_supervisors[:25]:
            Notification.objects.create(
                user=sup.user,
                message="You have logs pending review.",
                notification_type="log_review_pending",
                is_read=random.choice([True, False]),
            )

        for week in range(1, weeks_per_placement + 1):
            Deadline.objects.update_or_create(
                week_number=week,
                defaults={"submission_deadline": (now + timedelta(days=week * 7)).date()},
            )

        metric_values = {
            "internships_completed": Decimal(str(sum(1 for p in placements if p.status == "completed"))),
            "average_score": Decimal(str(round((sum([75 + random.random() * 20 for _ in range(max(evaluation_count, 1))]) / max(evaluation_count, 1)), 2))),
            "pending_reviews": Decimal(str(sum(1 for p in placements if p.status == "pending"))),
            "total_students": Decimal(str(len(students))),
            "active_placements": Decimal(str(sum(1 for p in placements if p.status in {"approved", "completed"}))),
        }

        calculated_at = now
        for metric_type, value in metric_values.items():
            DashboardMetric.objects.create(
                metric_type=metric_type,
                value=value,
                calculated_at=calculated_at,
            )

        self.stdout.write(self.style.SUCCESS("Synthetic data seeding complete."))
        self.stdout.write(
            f"Created: students={len(students)}, placements={len(placements)}, logs={total_logs}, "
            f"reviews={total_reviews}, evaluations={evaluation_count}, notifications={Notification.objects.count()}"
        )
