import React, { useState } from 'react';
import { useEffect } from 'react';
import { dashboardsAPI, evaluationsAPI, placementsAPI } from '../services/endpoints';

function ReportsPage() {
  const [activeTab, setActiveTab] = useState('internship');
  const [placements, setPlacements] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [placementsRes, evaluationsRes, metricsRes] = await Promise.all([
          placementsAPI.getPlacements(),
          evaluationsAPI.getEvaluations(),
          dashboardsAPI.getMetrics(),
        ]);

        setPlacements(placementsRes.results || placementsRes || []);
        setEvaluations(evaluationsRes.results || evaluationsRes || []);
        setMetrics(metricsRes.results || metricsRes || []);
      } catch (error) {
        console.error('Failed to fetch reports data', error);
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

  const tabs = [
    { id: 'internship', label: 'Internship Reports' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'evaluations', label: 'Evaluations' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Reports</h2>
        <p className="text-gray-600 mt-1">Internship reports and analytics</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {loading && <p className="text-gray-500 text-center py-8">Loading report data...</p>}
        {activeTab === 'internship' && (
          !loading && (
            <div className="space-y-3">
              <p className="text-gray-700">Total placements: {placements.length}</p>
              <p className="text-gray-700">Completed internships: {placements.filter((p) => p.status === 'completed').length}</p>
              <p className="text-gray-700">Approved placements: {placements.filter((p) => p.status === 'approved').length}</p>
            </div>
          )
        )}
        {activeTab === 'analytics' && (
          !loading && (
            <div className="space-y-3">
              <p className="text-gray-700">Total students: {getMetricValue('total_students')}</p>
              <p className="text-gray-700">Active placements: {getMetricValue('active_placements')}</p>
              <p className="text-gray-700">Pending reviews: {getMetricValue('pending_reviews')}</p>
            </div>
          )
        )}
        {activeTab === 'evaluations' && (
          !loading && (
            <div className="space-y-3">
              <p className="text-gray-700">Evaluations submitted: {evaluations.length}</p>
              <p className="text-gray-700">Average score: {Number(getMetricValue('average_score') || 0).toFixed(2)}</p>
              <p className="text-gray-700">A grades: {evaluations.filter((item) => item.grade === 'A').length}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default ReportsPage;