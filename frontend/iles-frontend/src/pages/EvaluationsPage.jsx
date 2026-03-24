import React, { useEffect, useState } from 'react';
import { evaluationsAPI } from '../services/endpoints';

function EvaluationsPage() {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvaluations = async () => {
      try {
        const data = await evaluationsAPI.getEvaluations();
        setEvaluations(data.results || data || []);
      } catch (error) {
        console.error('Failed to fetch evaluations', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluations();
  }, []);

  return (
    <div>
      <h2>Evaluations</h2>
      {loading ? (
        <p>Loading evaluations...</p>
      ) : evaluations.length === 0 ? (
        <p>No evaluations available.</p>
      ) : (
        <ul>
          {evaluations.map((evaluation) => (
            <li key={evaluation.evaluation_id}>
              Placement: {evaluation.placement} | Score: {evaluation.total_score || 'N/A'} | Grade: {evaluation.grade || 'N/A'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default EvaluationsPage;