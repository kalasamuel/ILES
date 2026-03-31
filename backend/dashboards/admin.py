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

    # Clean layout in form view
    fieldsets = (
        ('Metric Information', {
            'fields': ('metric_id', 'metric_type', 'value')
        }),
        ('Timestamps', {
            'fields': (
                'calculated_date',
                'calculated_at',
                'created_at',
                'updated_at',
            )
        }),
    )

   # Show totals at the bottom (very professional)
    def changelist_view(self, request, extra_context=None):
        response = super().changelist_view(request, extra_context=extra_context)

        try:
            qs = response.context_data['cl'].queryset
            total = qs.aggregate(total_value=Sum('value'))['total_value']
            response.context_data['total_metric_value'] = total
        except Exception:
            response.context_data['total_metric_value'] = None

        return response 
 