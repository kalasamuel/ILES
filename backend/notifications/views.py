from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Notification, Deadline
from .serializers import NotificationSerializer, DeadlineSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)


class DeadlineViewSet(viewsets.ModelViewSet):
    queryset = Deadline.objects.all()
    serializer_class = DeadlineSerializer
    permission_classes = [IsAuthenticated]
