# Step-by-Step Deployment Guide for Render

This guide provides instructions for deploying the ILES project (Django + Vite) to Render using the Neon PostgreSQL database.

## Prerequisites
1. A GitHub repository with your project pushed.
2. A Render account (connected to GitHub).
3. Your Neon PostgreSQL connection string (provided).

---

## Step 1: Prepare your Code
I have already made the following changes to prepare your project:
- Updated `backend/iles/settings.py` for production (WhiteNoise, `dj-database-url`, etc.).
- Updated `build.sh` to work from the project root.
- Created `render.yaml` for a "Blueprint" deployment.

**Action:** Commit and push these changes to your GitHub repository before proceeding.

---

## Step 2: Deploy to Render using Blueprint
1. Log in to the [Render Dashboard](https://dashboard.render.com).
2. Click **Blueprint** in the top navigation bar.
3. Select **New Blueprint Instance**.
4. Connect your GitHub repository.
5. Render will automatically detect the `render.yaml` file.
6. Click **Apply**.

---

## Step 3: Configure Environment Variables
During the deployment process, you will be prompted for some values, or you can set them in the Render Dashboard after the service is created:

### Backend (iles-backend)
- **DATABASE_URL**: Paste your Neon connection string:
  `postgresql://neondb_owner:npg_12IJAlYoxvns@ep-nameless-glade-abxv7c29.eu-west-2.aws.neon.tech/neondb?sslmode=require`
- **SECRET_KEY**: Render will generate this for you automatically.
- **ALLOWED_HOSTS**: Set this to `iles-backend.onrender.com` (or your specific Render sub-domain).

### Frontend (iles-frontend)
- **VITE_API_BASE_URL**: This is automatically linked to your backend in the `render.yaml`. No action needed.

---

## Step 4: Verify Deployment
1. Wait for both services to show a **Live** status in the Render Dashboard.
2. Open the **iles-frontend** URL (provided by Render).
3. Test the login and verify that data is being fetched from the backend.

---

## Troubleshooting
- **Static Files:** If CSS/JS doesn't load on the backend admin page, check the build logs for `collectstatic` errors.
- **Database Migrations:** If the backend fails to start, check the logs for database connection issues or migration failures.
- **CORS:** I have enabled CORS for all origins in development, but for production, you might want to restrict `CORS_ALLOWED_ORIGINS` in `settings.py` to your frontend URL.
