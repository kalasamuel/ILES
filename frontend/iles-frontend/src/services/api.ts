import axios from 'axios';
import {
  User, Student, Supervisor, Organization, InternshipPlacement,
  WeeklyLog, LogReview, Evaluation, Notification, DashboardMetric,
  ApiResponse, PaginatedResponse, ScoreBreakdown, WeeklyLogCreateUpdate
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication
export const authAPI = {
  login: async (email: string, password: string): Promise<{ user_id: string }> => {
    const response = await api.post('/accounts/users/login/', { email, password });
    return response.data;
  },
};

// Users
export const usersAPI = {
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/accounts/users/me/');
    return response.data;
  },
};

// Students
export const studentsAPI = {
  getStudents: async (): Promise<PaginatedResponse<Student>> => {
    const response = await api.get('/accounts/students/');
    return response.data;
  },
  getStudent: async (id: string): Promise<Student> => {
    const response = await api.get(`/accounts/students/${id}/`);
    return response.data;
  },
};

// Supervisors
export const supervisorsAPI = {
  getSupervisors: async (): Promise<PaginatedResponse<Supervisor>> => {
    const response = await api.get('/accounts/supervisors/');
    return response.data;
  },
  getSupervisor: async (id: string): Promise<Supervisor> => {
    const response = await api.get(`/accounts/supervisors/${id}/`);
    return response.data;
  },
};

// Organizations
export const organizationsAPI = {
  getOrganizations: async (): Promise<PaginatedResponse<Organization>> => {
    const response = await api.get('/organizations/organizations/');
    return response.data;
  },
  getOrganization: async (id: string): Promise<Organization> => {
    const response = await api.get(`/organizations/organizations/${id}/`);
    return response.data;
  },
};

// Placements
export const placementsAPI = {
  getPlacements: async (): Promise<PaginatedResponse<InternshipPlacement>> => {
    const response = await api.get('/placements/placements/');
    return response.data;
  },
  getPlacement: async (id: string): Promise<InternshipPlacement> => {
    const response = await api.get(`/placements/placements/${id}/`);
    return response.data;
  },
  createPlacement: async (data: Partial<InternshipPlacement>): Promise<InternshipPlacement> => {
    const response = await api.post('/placements/placements/', data);
    return response.data;
  },
  updatePlacement: async (id: string, data: Partial<InternshipPlacement>): Promise<InternshipPlacement> => {
    const response = await api.put(`/placements/placements/${id}/`, data);
    return response.data;
  },
  approvePlacement: async (id: string): Promise<ApiResponse<any>> => {
    const response = await api.post(`/placements/placements/${id}/approve/`);
    return response.data;
  },
  rejectPlacement: async (id: string): Promise<ApiResponse<any>> => {
    const response = await api.post(`/placements/placements/${id}/reject/`);
    return response.data;
  },
};

// Logbooks
export const logbooksAPI = {
  getLogs: async (): Promise<PaginatedResponse<WeeklyLog>> => {
    const response = await api.get('/logbooks/logs/');
    return response.data;
  },
  getLog: async (id: string): Promise<WeeklyLog> => {
    const response = await api.get(`/logbooks/logs/${id}/`);
    return response.data;
  },
  createLog: async (data: WeeklyLogCreateUpdate): Promise<WeeklyLog> => {
    const response = await api.post('/logbooks/logs/', data);
    return response.data;
  },
  updateLog: async (id: string, data: Partial<WeeklyLogCreateUpdate>): Promise<WeeklyLog> => {
    const response = await api.put(`/logbooks/logs/${id}/`, data);
    return response.data;
  },
  submitLog: async (id: string): Promise<ApiResponse<any>> => {
    const response = await api.post(`/logbooks/logs/${id}/submit/`);
    return response.data;
  },
};

// Reviews
export const reviewsAPI = {
  getReviews: async (): Promise<PaginatedResponse<LogReview>> => {
    const response = await api.get('/reviews/reviews/');
    return response.data;
  },
  getReview: async (id: string): Promise<LogReview> => {
    const response = await api.get(`/reviews/reviews/${id}/`);
    return response.data;
  },
  createReview: async (data: Partial<LogReview>): Promise<LogReview> => {
    const response = await api.post('/reviews/reviews/', data);
    return response.data;
  },
  approveReview: async (id: string): Promise<ApiResponse<any>> => {
    const response = await api.post(`/reviews/reviews/${id}/approve/`);
    return response.data;
  },
  rejectReview: async (id: string): Promise<ApiResponse<any>> => {
    const response = await api.post(`/reviews/reviews/${id}/reject/`);
    return response.data;
  },
};

// Evaluations
export const evaluationsAPI = {
  getEvaluations: async (): Promise<PaginatedResponse<Evaluation>> => {
    const response = await api.get('/evaluations/evaluations/');
    return response.data;
  },
  getEvaluation: async (id: string): Promise<Evaluation> => {
    const response = await api.get(`/evaluations/evaluations/${id}/`);
    return response.data;
  },
  createEvaluation: async (data: Partial<Evaluation>): Promise<Evaluation> => {
    const response = await api.post('/evaluations/evaluations/', data);
    return response.data;
  },
  getScoreBreakdown: async (placementId: string): Promise<ScoreBreakdown> => {
    const response = await api.get(`/evaluations/breakdowns/?placement=${placementId}`);
    return response.data.results[0];
  },
};

// Notifications
export const notificationsAPI = {
  getNotifications: async (): Promise<PaginatedResponse<Notification>> => {
    const response = await api.get('/notifications/notifications/');
    return response.data;
  },
  markAsRead: async (id: string): Promise<Notification> => {
    const response = await api.patch(`/notifications/notifications/${id}/`, { is_read: true });
    return response.data;
  },
};

// Dashboards
export const dashboardsAPI = {
  getMetrics: async (): Promise<PaginatedResponse<DashboardMetric>> => {
    const response = await api.get('/dashboards/metrics/');
    return response.data;
  },
  refreshMetrics: async (): Promise<DashboardMetric[]> => {
    const response = await api.get('/dashboards/metrics/refresh_metrics/');
    return response.data;
  },
};

export default api;