from django.contrib import admin
from .models import InternshipPlacement, PlacementDocument

@admin.register(InternshipPlacement)
class InternshipPlacementAdmin(admin.ModelAdmin):
    list_display = ['student', 'organization', 'position_title', 'status', 'start_date', 'end_date']

@admin.register(PlacementDocument)
class PlacementDocumentAdmin(admin.ModelAdmin):
    list_display = ['placement', 'document_type', 'uploaded_at']
