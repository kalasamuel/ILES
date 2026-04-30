import React, { useState } from 'react';
import { useEffect } from 'react';
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { dashboardsAPI, evaluationsAPI, placementsAPI } from '../services/endpoints';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import './ReportsPage.css';

function ReportsPage() {
  const [activeTab, setActiveTab] = useState('internship');
  const [placements, setPlacements] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [criteriaData, setCriteriaData] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [placementsRes, evaluationsRes, metricsRes, criteriaSummariesRes] = await Promise.all([
          placementsAPI.getPlacements(),
          evaluationsAPI.getEvaluations(),
          dashboardsAPI.getMetrics(),
          dashboardsAPI.getEvaluationCriteriaSummaries(),
        ]);

        setPlacements(placementsRes.results || placementsRes || []);
        setEvaluations(evaluationsRes.results || evaluationsRes || []);
        setMetrics(metricsRes.results || metricsRes || []);
        setCriteriaData(criteriaSummariesRes?.criteria_summaries || []);
      } catch (error) {
        console.error('Failed to fetch reports data', error);
        setError('Failed to load reports data. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getMetricValue = (type) => {
    const metric = metrics.find((item) => item.metric_type === type);
    return metric?.value ?? 0;
  };

  const internshipCompleted = placements.filter((p) => p.status === 'completed').length;
  const internshipApproved = placements.filter((p) => p.status === 'approved').length;
  const internshipPending = placements.filter((p) => p.status === 'pending').length;

  const averageScore = Number(getMetricValue('average_score') || 0).toFixed(2);
  const aGrades = evaluations.filter((item) => String(item.grade || '').toUpperCase() === 'A').length;

  const serializeCsv = (rows) => {
    if (!rows.length) {
      return '';
    }

    const headers = Object.keys(rows[0]);
    const escaped = rows.map((row) => headers.map((header) => {
      const value = row[header] ?? '';
      const text = String(value).replace(/"/g, '""');
      return `"${text}"`;
    }).join(','));

    return [headers.join(','), ...escaped].join('\n');
  };

  const downloadCsv = () => {
    let rows = [];
    let filename = 'reports-export.csv';

    if (activeTab === 'internship') {
      filename = 'internship-reports.csv';
      rows = placements.map((item) => ({
        placement_id: item.placement_id,
        student: item?.student_details?.registration_number || item?.student || 'N/A',
        organization: item?.organization_details?.name || item?.organization || 'N/A',
        position_title: item.position_title || 'N/A',
        status: item.status || 'N/A',
        start_date: item.start_date || 'N/A',
        end_date: item.end_date || 'N/A',
      }));
    } else if (activeTab === 'analytics') {
      filename = 'analytics-reports.csv';
      rows = [
        { metric: 'total_students', value: getMetricValue('total_students') },
        { metric: 'active_placements', value: getMetricValue('active_placements') },
        { metric: 'pending_reviews', value: getMetricValue('pending_reviews') },
        { metric: 'average_score', value: averageScore },
      ];
    } else {
      filename = 'evaluations-reports.csv';
      rows = evaluations.map((item) => ({
        evaluation_id: item.evaluation_id,
        placement: item.placement,
        grade: item.grade || 'N/A',
        status: item.status || 'N/A',
        evaluation_date: item.evaluation_date || 'N/A',
      }));
    }

    const csv = serializeCsv(rows);
    if (!csv) {
      return;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toDisplayDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString();
  };

  const tabs = [
    { id: 'internship', label: 'Internship Reports' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'evaluations', label: 'Evaluations' },
  ];

  return (
    <div className="reports-page">
      <div className="rp-header">
        <div>
          <h1>Reports</h1>
          <p>Generate internship summaries, analytics snapshots, and evaluation exports.</p>
        </div>

        <button
          type="button"
          className="rp-btn-primary"
          onClick={downloadCsv}
          disabled={loading}
        >
          Export Current Tab CSV
        </button>
      </div>

      <div className="rp-stats">
        <div className="rp-stat-card">
          <span className="rp-stat-label">Placements</span>
          <strong className="rp-stat-value">{placements.length}</strong>
        </div>
        <div className="rp-stat-card">
          <span className="rp-stat-label">Completed</span>
          <strong className="rp-stat-value">{internshipCompleted}</strong>
        </div>
        <div className="rp-stat-card">
          <span className="rp-stat-label">Evaluations</span>
          <strong className="rp-stat-value">{evaluations.length}</strong>
        </div>
        <div className="rp-stat-card">
          <span className="rp-stat-label">Average Score</span>
          <strong className="rp-stat-value">{averageScore}</strong>
        </div>
      </div>

      <div className="rp-tabs" role="tablist" aria-label="Report categories">
        <div className="rp-tabs-inner">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rp-tab${
                activeTab === tab.id
                  ? ' active'
                  : ''
              }`}
              role="tab"
              aria-selected={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <section className="rp-content">
        {loading && <LoadingSpinner text="Loading report data..." />}
        {!loading && error && <div className="rp-message error">{error}</div>}

        {activeTab === 'internship' && (
          !loading && !error && (
            <div className="rp-section">
              <div className="rp-kpis">
                <div className="rp-kpi-box">
                  <span>Approved placements</span>
                  <strong>{internshipApproved}</strong>
                </div>
                <div className="rp-kpi-box">
                  <span>Pending placements</span>
                  <strong>{internshipPending}</strong>
                </div>
                <div className="rp-kpi-box">
                  <span>Completion ratio</span>
                  <strong>{placements.length ? `${Math.round((internshipCompleted / placements.length) * 100)}%` : '0%'}</strong>
                </div>
              </div>

              {placements.length === 0 ? (
                <div className="rp-message">No placement records found.</div>
              ) : (
                <div className="rp-table-wrap">
                  <table className="rp-table">
                    <thead>
                      <tr>
                        <th>Position</th>
                        <th>Organization</th>
                        <th>Status</th>
                        <th>Start</th>
                        <th>End</th>
                      </tr>
                    </thead>
                    <tbody>
                      {placements.slice(0, 10).map((item) => (
                        <tr key={item.placement_id}>
                          <td>{item.position_title || 'N/A'}</td>
                          <td>{item?.organization_details?.name || 'N/A'}</td>
                          <td>
                            <span className={`rp-status ${String(item.status || 'pending').toLowerCase()}`}>
                              {item.status || 'pending'}
                            </span>
                          </td>
                          <td>{toDisplayDate(item.start_date)}</td>
                          <td>{toDisplayDate(item.end_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        )}

        {activeTab === 'analytics' && (
          !loading && !error && (
            <div className="rp-section">
              <div className="rp-analytics-grid">
                <article className="rp-analytics-card">
                  <h3>Total Students</h3>
                  <p>{getMetricValue('total_students')}</p>
                </article>
                <article className="rp-analytics-card">
                  <h3>Active Placements</h3>
                  <p>{getMetricValue('active_placements')}</p>
                </article>
                <article className="rp-analytics-card">
                  <h3>Pending Reviews</h3>
                  <p>{getMetricValue('pending_reviews')}</p>
                </article>
                <article className="rp-analytics-card">
                  <h3>Average Score</h3>
                  <p>{averageScore}</p>
                </article>
              </div>
            </div>
          )
        )}

        {activeTab === 'evaluations' && (
          !loading && !error && (
            <div className="rp-section">
              <div className="rp-kpis">
                <div className="rp-kpi-box">
                  <span>Submitted</span>
                  <strong>{evaluations.length}</strong>
                </div>
                <div className="rp-kpi-box">
                  <span>Average score</span>
                  <strong>{averageScore}</strong>
                </div>
                <div className="rp-kpi-box">
                  <span>A grades</span>
                  <strong>{aGrades}</strong>
                </div>
              </div>

              {/* Average Scores by Criteria Chart */}
              {criteriaData.length > 0 && (
                <div className="rp-chart-container" style={{ marginBottom: '40px' }}>
                  <h3 style={{ marginBottom: '20px' }}>Average Scores by Criteria</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={criteriaData} layout="vertical" margin={{ left: 150, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} unit="%" />
                      <YAxis dataKey="criteria" type="category" width={140} />
                      <Tooltip />
                      <Bar dataKey="avgPercentage" fill="#f97316" radius={[4, 4, 4, 4]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {evaluations.length === 0 ? (
                <div className="rp-message">No evaluations submitted yet.</div>
              ) : (
                <div className="rp-table-wrap">
                  <table className="rp-table">
                    <thead>
                      <tr>
                        <th>Evaluation ID</th>
                        <th>Grade</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluations.slice(0, 12).map((item) => (
                        <tr key={item.evaluation_id}>
                          <td>{item.evaluation_id || 'N/A'}</td>
                          <td>{item.grade || 'N/A'}</td>
                          <td>{item.status || 'N/A'}</td>
                          <td>{toDisplayDate(item.evaluation_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        )}
      </section>
    </div>
  );
}

export default ReportsPage;