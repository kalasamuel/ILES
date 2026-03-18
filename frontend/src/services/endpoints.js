import api from './apiClient';

// Authentication
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/token/', { email, password });
    return response.data;
  },
};

// Users
export const usersAPI = {
  getCurrentUser: async () => {
    const response = await api.get('/accounts/users/me/');
    return response.data;
  },
};

// Students
export const studentsAPI = {
  getStudents: async () => {
    const response = await api.get('/accounts/students/');
    return response.data;
  },
  getStudent: async (id) => {
    const response = await api.get(`/accounts/students/${id}/`);
    return response.data;
  },
};

// Supervisors
export const supervisorsAPI = {
  getSupervisors: async () => {
    const response = await api.get('/accounts/supervisors/');
    return response.data;
  },
  getSupervisor: async (id) => {
    const response = await api.get(`/accounts/supervisors/${id}/`);
    return response.data;
  },
};

// Organizations
export const organizationsAPI = {
  getOrganizations: async () => {
    const response = await api.get('/organizations/organizations/');
    return response.data;
  },
  getOrganization: async (id) => {
    const response = await api.get(`/organizations/organizations/${id}/`);
    return response.data;
  },
};

// Placements
export const placementsAPI = {
  getPlacements: async () => {
    const response = await api.get('/placements/placements/');
    return response.data;
  },
  getPlacement: async (id) => {
    const response = await api.get(`/placements/placements/${id}/`);
    return response.data;
  },
  createPlacement: async (data) => {
    const response = await api.post('/placements/placements/', data);
    return response.data;
  },
  updatePlacement: async (id, data) => {
    const response = await api.put(`/placements/placements/${id}/`, data);
    return response.data;
  },
  approvePlacement: async (id) => {
    const response = await api.post(`/placements/placements/${id}/approve/`);
    return response.data;
  },
  rejectPlacement: async (id) => {
    const response = await api.post(`/placements/placements/${id}/reject/`);
    return response.data;
  },
};

// Logbooks
export const logbooksAPI = {
  getLogs: async () => {
    const response = await api.get('/logbooks/logs/');
    return response.data;
  },
  getLog: async (id) => {
    const response = await api.get(`/logbooks/logs/${id}/`);
    return response.data;
  },
  createLog: async (data) => {
    const response = await api.post('/logbooks/logs/', data);
    return response.data;
  },
  updateLog: async (id, data) => {
    const response = await api.put(`/logbooks/logs/${id}/`, data);
    return response.data;
  },
  submitLog: async (id) => {
    const response = await api.post(`/logbooks/logs/${id}/submit/`);
    return response.data;
  },
};

// Reviews
export const reviewsAPI = {
  getReviews: async () => {
    const response = await api.get('/reviews/reviews/');
    return response.data;
  },
  getReview: async (id) => {
    const response = await api.get(`/reviews/reviews/${id}/`);
    return response.data;
  },
  createReview: async (data) => {
    const response = await api.post('/reviews/reviews/', data);
    return response.data;
  },
  approveReview: async (id) => {
    const response = await api.post(`/reviews/reviews/${id}/approve/`);
    return response.data;
  },
  rejectReview: async (id) => {
    const response = await api.post(`/reviews/reviews/${id}/reject/`);
    return response.data;
  },
};

// Evaluations
export const evaluationsAPI = {
  getEvaluations: async () => {
    const response = await api.get('/evaluations/evaluations/');
    return response.data;
  },
  getEvaluation: async (id) => {
    const response = await api.get(`/evaluations/evaluations/${id}/`);
    return response.data;
  },
  createEvaluation: async (data) => {
    const response = await api.post('/evaluations/evaluations/', data);
    return response.data;
  },
  getScoreBreakdown: async (placementId) => {
    const response = await api.get(`/evaluations/breakdowns/?placement=${placementId}`);
    return response.data.results[0];
  },
};

// Notifications
export const notificationsAPI = {
  getNotifications: async () => {
    const response = await api.get('/notifications/notifications/');
    return response.data;
  },
  markAsRead: async (id) => {
    const response = await api.patch(`/notifications/notifications/${id}/`, { is_read: true });
    return response.data;
  },
};

// Dashboards
export const dashboardsAPI = {
  getMetrics: async () => {
    const response = await api.get('/dashboards/metrics/');
    return response.data;
  },
  refreshMetrics: async () => {
    const response = await api.get('/dashboards/metrics/refresh_metrics/');
    return response.data;
  },
};