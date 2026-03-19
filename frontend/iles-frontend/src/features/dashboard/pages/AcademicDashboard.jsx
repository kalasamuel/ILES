import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAuth } from '../../../hooks/AuthContext';
import { evaluationsAPI, placementsAPI } from '../../../services/endpoints';

function AcademicDashboard() {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [evaluationsRes, placementsRes] = await Promise.all([
          evaluationsAPI.getEvaluations(),
          placementsAPI.getPlacements(),
        ]);

        setEvaluations(evaluationsRes.results);
        setPlacements(placementsRes.results);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Mock data for charts
  const evaluationStatusData = [
    { name: 'Completed', value: 20, color: '#00C49F' },
    { name: 'Pending', value: 5, color: '#FFBB28' },
    { name: 'Overdue', value: 2, color: '#FF8042' },
  ];

  const evaluationTrend = [
    { month: 'Jan', evaluations: 8 },
    { month: 'Feb', evaluations: 12 },
    { month: 'Mar', evaluations: 15 },
    { month: 'Apr', evaluations: 18 },
  ];

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="academic-dashboard">
      <header className="dashboard-header">
        <h1>Academic Dashboard</h1>
        <p>Welcome, {user?.first_name} {user?.last_name}</p>
      </header>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Pending Evaluations</h3>
          <div className="stat-number">{evaluations.filter(e => !e.total_score).length}</div>
          <p>Evaluations awaiting completion</p>
          <Link to="/app/evaluations" className="btn btn-secondary">View Evaluations</Link>
        </div>

        <div className="dashboard-card">
          <h3>My Students</h3>
          <div className="stat-number">{placements.length}</div>
          <p>Students under academic supervision</p>
          <Link to="/app/placements" className="btn btn-secondary">View Students</Link>
        </div>

        <div className="dashboard-card">
          <h3>Recent Evaluations</h3>
          <ul>
            {evaluations.slice(0, 3).map((evaluation) => (
              <li key={evaluation.evaluation_id}>
                Evaluated {evaluation.placement.student.user.first_name} - Score: {evaluation.total_score || 'Pending'}
              </li>
            ))}
          </ul>
        </div>

        <div className="dashboard-card chart-card">
          <h3>Evaluation Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={evaluationStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {evaluationStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="dashboard-card chart-card">
          <h3>Monthly Evaluations</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={evaluationTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="evaluations" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="dashboard-card">
          <h3>Quick Actions</h3>
          <Link to="/app/evaluations" className="btn btn-primary">Complete Pending Evaluations</Link>
          <Link to="/app/reports" className="btn btn-secondary">View Performance Reports</Link>
          <Link to="/app/placements" className="btn btn-secondary">Monitor Student Progress</Link>
        </div>
      </div>
    </div>
  );
}

export default AcademicDashboard;