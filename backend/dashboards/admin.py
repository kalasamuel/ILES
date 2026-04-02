from django.contrib import admin
from django.db.models import Sum
from simple_history.admin import SimpleHistoryAdmin
from .models import DashboardMetric

@admin.register(DashboardMetric)
class DashboardMetricAdmin(admin.ModelAdmin):
    list_display = (
        'metric_type',
        'value',
        'calculated_at',
        'updated_at',
    )

    list_filter = (
        'metric_type',
        'calculated_at',
    )

    search_fields = ('metric_type',)

    ordering = ('-calculated_at',)

    readonly_fields = (
        'metric_id',
        'calculated_at',
        'created_at',
        'updated_at',
    )

    date_hierarchy = 'calculated_at'

    fieldsets = (
        ('Metric Information', {
            'fields': ('metric_id', 'metric_type', 'value')
        }),
        ('Timestamps', {
            'fields': (
                'calculated_at',
                'created_at',
                'updated_at',
            )
        }),
    )
 