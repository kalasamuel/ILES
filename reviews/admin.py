from django.contrib import admin
from .models import LogReview, WorkflowHistory

@admin.register(LogReview)
class LogReviewAdmin(admin.ModelAdmin):
    list_display = ['log', 'supervisor', 'status', 'reviewed_at']

@admin.register(WorkflowHistory)
class WorkflowHistoryAdmin(admin.ModelAdmin):
    list_display = ['entity_type', 'entity_id', 'new_status', 'changed_by', 'changed_at']
