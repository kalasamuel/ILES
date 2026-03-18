# ILES Frontend

The frontend application for the Internship Logging & Evaluation System (ILES), built with React.js and TypeScript.

## Technology Stack

- **React.js** - Core framework for building the user interface
- **TypeScript** - Type-safe JavaScript for better development experience
- **React Router** - Client-side routing and navigation
- **Recharts** - Data visualization library for charts and graphs
- **Axios** - HTTP client for API communication
- **CSS** - Styling for responsive UI components

## Features

### Role-Based Dashboards
- **Student Dashboard**: View placements, submit weekly logs, track progress with charts
- **Supervisor Dashboard**: Review student logs, monitor workload, view analytics
- **Admin Dashboard**: System-wide metrics, user management, comprehensive analytics

### Interactive Components
- **Weekly Log Forms**: Rich text forms for activity logging
- **Data Visualizations**: Line charts, bar charts, pie charts using Recharts
- **Real-time Updates**: Live data from Django REST API backend

### Authentication & Security
- **Protected Routes**: Role-based access control
- **Session Management**: Token-based authentication
- **Secure API Communication**: Axios interceptors for auth handling

## Project Structure

```
src/
├── components/          # Reusable UI components
│   └── ProtectedRoute.tsx
├── hooks/              # Custom React hooks
│   └── AuthContext.tsx
├── pages/              # Page components
│   ├── Login.tsx
│   ├── StudentDashboard.tsx
│   ├── SupervisorDashboard.tsx
│   ├── AdminDashboard.tsx
│   └── WeeklyLogForm.tsx
├── services/           # API service functions
│   └── api.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── App.tsx             # Main app component with routing
├── App.css             # Global styles
├── index.tsx           # App entry point
└── index.css           # Base styles
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Running ILES Django backend

### Installation

1. **Clone and navigate to frontend directory:**
   ```bash
   cd iles/frontend/iles-frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```
   REACT_APP_API_URL=http://localhost:8000/api
   ```

4. **Start the development server:**
   ```bash
   npm start
   ```

The application will be available at `http://localhost:3000`

## API Integration

The frontend communicates with the Django REST API backend through the following services:

- **Authentication**: Login/logout functionality
- **Users**: Student and supervisor data management
- **Placements**: Internship placement CRUD operations
- **Logbooks**: Weekly log submission and management
- **Reviews**: Supervisor review workflow
- **Evaluations**: Academic evaluation and scoring
- **Notifications**: User notifications
- **Dashboards**: Analytics and metrics

## Key Components

### AuthContext
Provides authentication state management across the application:
- User session handling
- Login/logout functionality
- Role-based permissions

### ProtectedRoute
Guards routes based on user roles:
- Redirects unauthorized users
- Supports multiple allowed roles per route

### Dashboard Components
Feature-rich dashboards with:
- Real-time data visualization
- Interactive charts and graphs
- Quick action buttons
- Status indicators

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow React best practices
- Use functional components with hooks
- Implement proper error handling

### State Management
- React Context for global state (authentication)
- Local component state for UI state
- API calls for server state

### Styling
- CSS modules for component-specific styles
- Responsive design principles
- Consistent color scheme and typography

## Deployment

1. **Build for production:**
   ```bash
   npm run build
   ```

2. **Serve static files:**
   The `build` directory contains the production-ready application.

3. **Environment configuration:**
   Set `REACT_APP_API_URL` to the production API endpoint.

## Contributing

1. Follow the established project structure
2. Use TypeScript for all new components
3. Implement proper error handling
4. Test API integrations thoroughly
5. Follow React and TypeScript best practices

## Related Documentation

- [ILES Backend API Documentation](../README.md)
- [React Documentation](https://reactjs.org/)
- [React Router Documentation](https://reactrouter.com/)
- [Recharts Documentation](https://recharts.org/)