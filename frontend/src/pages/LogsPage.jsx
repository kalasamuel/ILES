import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Placeholder components
function LogList() {
  return (
    <div>
      <h2>Weekly Logs</h2>
      <p>List of all weekly logs</p>
    </div>
  );
}

function LogCreate() {
  return (
    <div>
      <h2>Create Log</h2>
      <p>Form to create new weekly log</p>
    </div>
  );
}

function LogDetails() {
  return (
    <div>
      <h2>Log Details</h2>
      <p>Details of a specific log</p>
    </div>
  );
}

function LogsPage() {
  return (
    <Routes>
      <Route index element={<LogList />} />
      <Route path="create" element={<LogCreate />} />
      <Route path=":id" element={<LogDetails />} />
    </Routes>
  );
}

export default LogsPage;