// Utility functions for the application

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString();
};

export const formatStatus = (status) => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const getStatusColor = (status) => {
  const colors = {
    approved: 'green',
    rejected: 'red',
    pending: 'yellow',
    submitted: 'blue',
    draft: 'gray',
  };
  return colors[status] || 'gray';
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};