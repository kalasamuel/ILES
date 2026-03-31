from django.contrib import admin
from django.db.models import Sum
from simple_history.admin import SimpleHistoryAdmin
from .models import DashboardMetric

@admin.register(DashboardMetric)
class DashboardMetricAdmin(admin.ModelAdmin):
    list_display = (
        'metric_type',
        'value',
        'calculated_date',
        'calculated_at',
        'updated_at',
    )
     # Powerful filters on the right
    list_filter = (
        'metric_type',
        'calculated_date',
    )

        # Search by metric type
    search_fields = ('metric_type',)

    # Latest first
    ordering = ('-calculated_at',)

    # Prevent dangerous edits
    readonly_fields = (
        'metric_id',
        'calculated_date',
        'calculated_at',
        'created_at',
        'updated_at',
    )

     # Navigate by dates (very useful)
    date_hierarchy = 'calculated_date'