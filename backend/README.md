# ILES
Internship Logging and Evaluation System (ILES)

## Password Reset Email Setup

The forgot-password flow sends a real email when SMTP is configured in `backend/.env`.

Set `EMAIL_HOST` and the related SMTP fields to enable delivery. If `EMAIL_HOST` is left empty, Django falls back to the console email backend so reset links are printed to the terminal during development.

Required settings for a typical SMTP provider:

- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USE_TLS` or `EMAIL_USE_SSL`
- `EMAIL_HOST_USER`
- `EMAIL_HOST_PASSWORD`
- `DEFAULT_FROM_EMAIL`
