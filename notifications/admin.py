from django.contrib import admin
from .models import Notification, Deadline

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'notification_type', 'is_read', 'created_at']

@admin.register(Deadline)
class DeadlineAdmin(admin.ModelAdmin):
    list_display = ['week_number', 'submission_deadline']
