"""
SendGrid Email Backend for Django
"""
from django.core.mail.backends.base import BaseEmailBackend
from django.conf import settings
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To
import logging

logger = logging.getLogger(__name__)


class SendgridBackend(BaseEmailBackend):
    """
    SendGrid backend for Django email sending.
    """

    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.client = SendGridAPIClient(settings.SENDGRID_API_KEY)

    def send_messages(self, email_messages):
        """
        Send one or more EmailMessage objects and return the number of email
        messages sent.
        """
        if not email_messages:
            return 0

        msg_count = 0
        for message in email_messages:
            try:
                self._send(message)
                msg_count += 1
            except Exception:
                if not self.fail_silently:
                    raise
                logger.exception('Failed to send email via SendGrid')

        return msg_count

    def _send(self, message):
        """
        Send a single EmailMessage object to SendGrid.
        """
        # Build the email
        from_email = Email(message.from_email)
        to_emails = [To(email) for email in message.to]

        mail = Mail(
            from_email=from_email,
            to_emails=to_emails,
            subject=message.subject,
            plain_text_content=message.body,
        )

        # Add HTML content if available
        if message.alternatives:
            for alternative, mimetype in message.alternatives:
                if mimetype == 'text/html':
                    mail.plain_text_content = message.body
                    mail.html_content = alternative
                    break

        # Add CC and BCC
        if message.cc:
            for email in message.cc:
                mail.add_cc(Email(email))

        if message.bcc:
            for email in message.bcc:
                mail.add_bcc(Email(email))

        # Add reply-to
        if message.reply_to:
            mail.reply_to = Email(message.reply_to[0])

        # Send via SendGrid
        response = self.client.send(mail)

        if response.status_code not in (200, 201, 202):
            raise Exception(f'SendGrid API error: {response.status_code}')

        return response
