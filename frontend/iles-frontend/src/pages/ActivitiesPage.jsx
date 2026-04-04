import React, { useEffect, useMemo, useState } from 'react';
import { evaluationsAPI, logbooksAPI, placementsAPI, reviewsAPI } from '../services/endpoints';

function ActivitiesPage() {
  const [reviews, setReviews] = useState([]);
  const [logs, setLogs] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reviewsRes, logsRes, evaluationsRes, placementsRes] = await Promise.all([
          reviewsAPI.getReviews(),
          logbooksAPI.getLogs(),
          evaluationsAPI.getEvaluations(),
          placementsAPI.getPlacements(),
        ]);

        setReviews(reviewsRes?.results || reviewsRes || []);
        setLogs(logsRes?.results || logsRes || []);
        setEvaluations(evaluationsRes?.results || evaluationsRes || []);
        setPlacements(placementsRes?.results || placementsRes || []);
      } catch (error) {
        console.error('Failed to fetch activities', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const placementsById = useMemo(() => {
    return new Map(placements.map((placement) => [placement?.placement_id, placement]));
  }, [placements]);

  const getStudentLabel = (placement) => {
    const first = placement?.student_details?.user_details?.first_name || '';
    const last = placement?.student_details?.user_details?.last_name || '';
    const fullName = `${first} ${last}`.trim();
    if (fullName) {
      return fullName;
    }
    return placement?.student_details?.registration_number || 'Unknown student';
  };

  const parseDate = (value) => {
    if (!value) {
      return 0;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  };

  const formatDate = (value) => {
    if (!value) {
      return 'Date unavailable';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Date unavailable';
    }
    return date.toLocaleString();
  };

  const activities = useMemo(() => {
    const pendingActivities = logs
      .filter((log) => log?.status === 'submitted')
      .map((log) => {
        const placement = placementsById.get(log?.placement);
        return {
          id: `pending-${log.log_id || log.id}`,
          title: 'Pending log submission review',
          detail: `${getStudentLabel(placement)} • Week ${log.week_number || 'N/A'}`,
          date: log?.submitted_at,
          type: 'Pending Review',
        };
      });

    const reviewActivities = reviews.map((review) => ({
      id: `review-${review.review_id || review.id}`,
      title: 'Log review updated',
      detail: `Status: ${String(review?.status || 'unknown').replace('_', ' ')}`,
      date: review?.reviewed_at,
      type: 'Review',
    }));

    const evaluationActivities = evaluations.map((evaluation) => {
      const placement = placementsById.get(evaluation?.placement);
      return {
        id: `evaluation-${evaluation.evaluation_id || evaluation.id}`,
        title: 'Evaluation completed',
        detail: `${getStudentLabel(placement)} • Grade: ${evaluation?.grade || 'N/A'}`,
        date: evaluation?.evaluation_date,
        type: 'Evaluation',
      };
    });

    return [...pendingActivities, ...reviewActivities, ...evaluationActivities]
      .sort((a, b) => parseDate(b.date) - parseDate(a.date));
  }, [logs, reviews, evaluations, placementsById]);

  return (
    <div className="p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800">All Activities</h2>
        <p className="text-gray-600 mt-1">Recent supervisor activity across reviews and evaluations</p>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading activities...</p>
      ) : activities.length === 0 ? (
        <p className="text-gray-500">No activities found.</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {activities.map((activity) => (
              <li key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-800">{activity.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{activity.detail}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700">
                      {activity.type}
                    </span>
                    <p className="text-xs text-gray-500 mt-2">{formatDate(activity.date)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ActivitiesPage;
