import React from 'react';

function StatusBadge({ status }) {
  const getStatusColor = (status) => {
    const colors = {
      submitted: 'blue',
      approved: 'green',
      rejected: 'red',
      pending: 'yellow',
      draft: 'gray',
    };
    return colors[status] || 'gray';
  };

  return (
    <div className={`status-badge status-${getStatusColor(status)}`}>
      Status: {status.toUpperCase()}
    </div>
  );
}

export default StatusBadge;