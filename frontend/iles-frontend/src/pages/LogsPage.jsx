import React, { useEffect, useState } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { logbooksAPI } from '../services/endpoints';
import WeeklyLogForm from './WeeklyLogForm';

function LogList() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await logbooksAPI.getLogs();
        setLogs(data.results || data || []);
      } catch (error) {
        console.error('Failed to fetch logs', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  if (loading) return <p>Loading logs...</p>;

  return (
    <div>
      <h2>Weekly Logs</h2>
      {logs.length === 0 ? (
        <p>No logs found.</p>
      ) : (
        <ul>
          {logs.map((log) => (
            <li key={log.log_id}>
              Week {log.week_number} - {log.status} - {log.hours_worked} hours
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LogDetails() {
  const { id } = useParams();
  const [log, setLog] = useState(null);

  useEffect(() => {
    const fetchLog = async () => {
      try {
        const data = await logbooksAPI.getLog(id);
        setLog(data);
      } catch (error) {
        console.error('Failed to fetch log', error);
      }
    };

    if (id) fetchLog();
  }, [id]);

  return (
    <div>
      <h2>Log Details</h2>
      {!log ? (
        <p>Loading log details...</p>
      ) : (
        <div>
          <p>Week: {log.week_number}</p>
          <p>Status: {log.status}</p>
          <p>Activities: {log.activities_performed}</p>
        </div>
      )}
    </div>
  );
}

function LogsPage() {
  return (
    <Routes>
      <Route index element={<LogList />} />
      <Route path="create" element={<WeeklyLogForm />} />
      <Route path="create/:placementId" element={<WeeklyLogForm />} />
      <Route path="create/:placementId/:weekNumber" element={<WeeklyLogForm />} />
      <Route path=":id" element={<LogDetails />} />
    </Routes>
  );
}

export default LogsPage;