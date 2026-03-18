from django.contrib import admin
from .models import DashboardMetric

@admin.register(DashboardMetric)
class DashboardMetricAdmin(admin.ModelAdmin):
    list_display = ['metric_type', 'value', 'calculated_at']
