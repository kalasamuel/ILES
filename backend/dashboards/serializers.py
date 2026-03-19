from rest_framework import serializers
from .models import DashboardMetric

class DashboardMetricSerializer(serializers.ModelSerializer):
    """
    Serializer for DashboardMetric.
    - Only exposes relevant fields.
    - Protects read-only fields from being modified via API.
    - Validates metric values.
    """

    class Meta:
        model = DashboardMetric
        fields = [
            'metric_id',
            'metric_type',
            'value',
            'calculated_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['metric_id', 'created_at', 'updated_at']

    def validate_value(self, value):
        """
        Ensure the metric value is non-negative.
        """
        if value < 0:
            raise serializers.ValidationError("Metric value cannot be negative.")
        return value  