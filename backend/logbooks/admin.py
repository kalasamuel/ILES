from django.contrib import admin
from .models import WeeklyLog, LogAttachment

@admin.register(WeeklyLog)
class WeeklyLogAdmin(admin.ModelAdmin):
    list_display = ['placement', 'week_number', 'status', 'submitted_at']

@admin.register(LogAttachment)
class LogAttachmentAdmin(admin.ModelAdmin):
    list_display = ['log', 'description', 'uploaded_at']
