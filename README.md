# ILES - Internship Logging & Evaluation System

A comprehensive Django REST API backend with React.js frontend for managing internship programs, student progress tracking, and evaluation workflows.

## Project Structure

```
ILES/
├── manage.py                 # Django management script
├── requirements.txt          # Python dependencies
├── iles/                     # Django project settings
├── accounts/                 # User management app
├── organizations/            # Company/organization management
├── placements/               # Internship placement management
├── logbooks/                 # Weekly activity logging
├── reviews/                  # Supervisor review workflow
├── evaluations/              # Academic evaluation system
├── notifications/            # Notification system
├── dashboards/               # Analytics and reporting
└── frontend/                 # React.js frontend application
    └── iles-frontend/        # React TypeScript project
```

## Technology Stack

### Backend (Django)
- **Framework**: Django 5.2.7
- **API**: Django REST Framework 3.15.2
- **Database**: PostgreSQL
- **Authentication**: Custom user model with role-based access
- **Additional**: django-cors-headers, django-environ

### Frontend (React)
- **Framework**: React.js with TypeScript
- **Routing**: React Router
- **Charts**: Recharts for data visualization
- **HTTP Client**: Axios
- **Styling**: CSS with responsive design

## Quick Start

### Backend Setup

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment:**
   Create `.env` file with database credentials

3. **Run migrations:**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

4. **Start development server:**
   ```bash
   python manage.py runserver
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend/iles-frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure API URL:**
   Create `.env` file:
   ```
   REACT_APP_API_URL=http://localhost:8000/api
   ```

4. **Start development server:**
   ```bash
   npm start
   ```

## Features

### Core Functionality
- **Multi-institution Support**: Manage internships across different organizations
- **Role-Based Access Control**: Student, Workplace Supervisor, Academic Supervisor, Admin roles
- **Weekly Activity Logging**: Structured log submission with attachments
- **Supervisor Reviews**: Multi-level review workflow with status tracking
- **Academic Evaluations**: Configurable criteria-based scoring system
- **Automated Score Computation**: Weighted final grade calculation
- **Dashboard Analytics**: Real-time metrics and visualizations
- **Notification System**: Automated alerts for all stakeholders
- **Audit Trail**: Complete workflow history tracking

### API Endpoints
- **Authentication**: `/api/accounts/users/login/`
- **Users Management**: `/api/accounts/users/`, `/api/accounts/students/`, `/api/accounts/supervisors/`
- **Organizations**: `/api/organizations/organizations/`
- **Placements**: `/api/placements/placements/`, `/api/placements/documents/`
- **Logbooks**: `/api/logbooks/logs/`, `/api/logbooks/attachments/`
- **Reviews**: `/api/reviews/reviews/`, `/api/reviews/history/`
- **Evaluations**: `/api/evaluations/criteria/`, `/api/evaluations/evaluations/`, `/api/evaluations/scores/`
- **Dashboards**: `/api/dashboards/metrics/`

### Frontend Pages
- **Login**: Authentication portal
- **Student Dashboard**: Placement overview, log submission, progress charts
- **Supervisor Dashboard**: Review queue, workload analytics, student progress
- **Admin Dashboard**: System metrics, user management, comprehensive analytics
- **Weekly Log Form**: Rich form for activity logging

## Database Schema

The system uses a normalized PostgreSQL database with 19+ core tables including:
- User management (Users, Roles, Departments, Students, Supervisors)
- Organization data (Organizations)
- Placement management (InternshipPlacements, PlacementDocuments)
- Activity logging (WeeklyLogs, LogAttachments)
- Review workflow (LogReviews, WorkflowHistory)
- Evaluation system (EvaluationCriteria, Evaluations, EvaluationScores, ScoreBreakdown)
- System utilities (Notifications, Deadlines, DashboardMetrics)

## Development

### Backend Development
- Uses Django's class-based views and ModelViewSets
- Custom user model with email authentication
- Comprehensive serializers with nested relationships
- Business logic in view methods and model methods

### Frontend Development
- TypeScript for type safety
- React Context for state management
- Protected routes with role-based access
- Recharts for interactive data visualizations
- Axios for API communication with interceptors

## Deployment

### Backend Deployment
1. Configure production database settings
2. Set `DEBUG=False` and configure allowed hosts
3. Use a production WSGI server (gunicorn)
4. Configure static file serving

### Frontend Deployment
1. Build production bundle: `npm run build`
2. Serve static files from `build/` directory
3. Configure API base URL for production

## Contributing

1. Follow the established code structure
2. Use TypeScript for frontend components
3. Implement proper error handling
4. Write comprehensive API documentation
5. Test both API endpoints and UI components

## License

This project is developed for educational purposes as part of the Software Development Project (SDP) course.