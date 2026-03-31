from django.contrib import admin
from django.db.models import Sum
from simple_history.admin import SimpleHistoryAdmin
from .models import DashboardMetric

@admin.register(DashboardMetric)
class DashboardMetricAdmin(admin.ModelAdmin):
    list_display = ['metric_type', 'value', 'calculated_at']
