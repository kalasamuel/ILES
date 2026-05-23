import React, { useEffect, useMemo, useState } from 'react';
import { evaluationsAPI, logbooksAPI, placementsAPI, reviewsAPI } from '../services/endpoints';
import { FiClock, FiFileText, FiCheck } from 'react-icons/fi';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import MaskedUserName from '../components/users/MaskedUserName';
import './ActivitiesPage.css';

function ActivitiesPage() {
  const [reviews, setReviews] = useState([]);
  const [logs, setLogs] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [activeType, setActiveType] = useState('All');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
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
        setError('Failed to load activity feed. Please refresh and try again.');
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
    const user = placement?.student_details?.user_details || null;
    const reg = placement?.student_details?.registration_number || null;
    if (!user && reg) return reg;
    if (!user && !reg) return 'Unknown student';
    return <MaskedUserName user={user} fallback={reg || 'Unknown student'} />;
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

  const formatDateOnly = (value) => {
    if (!value) {
      return 'N/A';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }
    return date.toLocaleDateString();
  };

  const activities = useMemo(() => {
    const pendingActivities = logs
      .filter((log) => log?.status === 'submitted')
      .map((log) => {
        const placement = placementsById.get(log?.placement);
        return {
          id: `pending-${log.log_id || log.id}`,
          title: 'Pending weekly log review',
          detail: `${getStudentLabel(placement)} • Week ${log.week_number || 'N/A'}`,
          subtitle: placement?.position_title ? `${placement.position_title} at ${placement?.organization_details?.name || 'Organization'}` : 'Placement details unavailable',
          date: log?.submitted_at,
          type: 'Pending Review',
          icon: <FiClock className="ac-icon" aria-hidden="true" />,
        };
      });

    const reviewActivities = reviews.map((review) => ({
      id: `review-${review.review_id || review.id}`,
      title: 'Log review updated',
      detail: `Status: ${String(review?.status || 'unknown').replace('_', ' ')}`,
      subtitle: review?.comments ? review.comments : 'No comment provided',
      date: review?.reviewed_at,
      type: 'Review',
      icon: <FiFileText className="ac-icon" aria-hidden="true" />,
    }));

    const evaluationActivities = evaluations.map((evaluation) => {
      const placement = placementsById.get(evaluation?.placement);
        return {
        id: `evaluation-${evaluation.evaluation_id || evaluation.id}`,
        title: 'Evaluation completed',
        detail: `${getStudentLabel(placement)} • Grade: ${evaluation?.grade || 'N/A'}`,
        subtitle: placement?.position_title ? `${placement.position_title} at ${placement?.organization_details?.name || 'Organization'}` : 'Placement details unavailable',
        date: evaluation?.evaluation_date,
        type: 'Evaluation',
        icon: <FiCheck className="ac-icon" aria-hidden="true" />,
      };
    });

    return [...pendingActivities, ...reviewActivities, ...evaluationActivities]
      .sort((a, b) => parseDate(b.date) - parseDate(a.date));
  }, [logs, reviews, evaluations, placementsById]);

  const typeStats = useMemo(() => {
    const pending = activities.filter((activity) => activity.type === 'Pending Review').length;
    const review = activities.filter((activity) => activity.type === 'Review').length;
    const evaluation = activities.filter((activity) => activity.type === 'Evaluation').length;

    return {
      total: activities.length,
      pending,
      review,
      evaluation,
    };
  }, [activities]);

  const filteredActivities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return activities.filter((activity) => {
      const byType = activeType === 'All' || activity.type === activeType;
      if (!byType) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = `${activity.title} ${activity.detail} ${activity.subtitle || ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activities, activeType, query]);

  const lastUpdated = useMemo(() => {
    return activities.length > 0 ? formatDateOnly(activities[0].date) : 'N/A';
  }, [activities]);

  return (
    <div className="activities-page">
      <div className="ac-header">
        <div>
          <h1>Activities</h1>
          <p>Track recent review and evaluation events across your internship workflow.</p>
        </div>

        <div className="ac-header-meta">
          <span className="ac-updated-pill">Last update: {lastUpdated}</span>
        </div>
      </div>

      <div className="ac-stats">
        <article className="ac-stat-card">
          <span className="ac-stat-label">Total Events</span>
          <strong className="ac-stat-value">{typeStats.total}</strong>
        </article>
        <article className="ac-stat-card pending">
          <span className="ac-stat-label">Pending Reviews</span>
          <strong className="ac-stat-value">{typeStats.pending}</strong>
        </article>
        <article className="ac-stat-card review">
          <span className="ac-stat-label">Review Updates</span>
          <strong className="ac-stat-value">{typeStats.review}</strong>
        </article>
        <article className="ac-stat-card evaluation">
          <span className="ac-stat-label">Evaluations</span>
          <strong className="ac-stat-value">{typeStats.evaluation}</strong>
        </article>
      </div>

      <div className="ac-controls">
        <div className="ac-filters" role="tablist" aria-label="Activity type filters">
          {['All', 'Pending Review', 'Review', 'Evaluation'].map((filter) => (
            <button
              key={filter}
              type="button"
              className={`ac-filter-chip${activeType === filter ? ' active' : ''}`}
              onClick={() => setActiveType(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        <label className="ac-search">
          <span>Search</span>
          <input
            type="search"
            placeholder="Search by student, status, or activity..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading activity feed..." />
      ) : error ? (
        <div className="ac-message ac-error">{error}</div>
      ) : filteredActivities.length === 0 ? (
        <div className="ac-message ac-empty">
          <p>No activities match the current filter.</p>
        </div>
      ) : (
        <section className="ac-feed" aria-live="polite">
          <ul>
            {filteredActivities.map((activity) => (
              <li key={activity.id} className="ac-item">
                <div className="ac-item-icon" aria-hidden="true">{activity.icon}</div>
                <div className="ac-item-main">
                  <div className="ac-item-top">
                    <h3>{activity.title}</h3>
                    <span className={`ac-type-badge ${activity.type.toLowerCase().replace(' ', '-')}`}>{activity.type}</span>
                  </div>
                  <p className="ac-item-detail">{activity.detail}</p>
                  <p className="ac-item-subtitle">{activity.subtitle}</p>
                </div>
                <div className="ac-item-time">{formatDate(activity.date)}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default ActivitiesPage;
