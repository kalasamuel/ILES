from django.contrib import admin
from .models import EvaluationCriteria, Evaluation, EvaluationScore, ScoreBreakdown

@admin.register(EvaluationCriteria)
class EvaluationCriteriaAdmin(admin.ModelAdmin):
    list_display = ['name', 'weight_percentage', 'max_score']

@admin.register(Evaluation)
class EvaluationAdmin(admin.ModelAdmin):
    list_display = ['placement', 'evaluator', 'total_score', 'grade']

@admin.register(EvaluationScore)
class EvaluationScoreAdmin(admin.ModelAdmin):
    list_display = ['evaluation', 'criteria', 'score']

@admin.register(ScoreBreakdown)
class ScoreBreakdownAdmin(admin.ModelAdmin):
    list_display = ['placement', 'supervisor_score', 'academic_score', 'logbook_score', 'final_score', 'grade']
