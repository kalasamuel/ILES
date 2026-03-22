import React, { useState } from 'react';

function ReportsPage() {
  const [activeTab, setActiveTab] = useState('internship');

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
        {activeTab === 'internship' && (
          <p className="text-gray-500 text-center py-8">
            Your Internship reports will appear here.
          </p>
        )}
        {activeTab === 'analytics' && (
          <p className="text-gray-500 text-center py-8">
            Analytics data will appear here.
          </p>
        )}
        {activeTab === 'evaluations' && (
          <p className="text-gray-500 text-center py-8">
            Supervisor evaluations will appear here.
          </p>
        )}
      </div>
    </div>
  );
}

export default ReportsPage;