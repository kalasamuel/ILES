import React, { useEffect, useState } from 'react';
import { FiClipboard } from 'react-icons/fi';
import { reviewsAPI } from '../services/endpoints';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import './ReviewsPage.css';

const FILTERS = ['All', 'Approved', 'Pending', 'Needs Revision', 'Rejected'];

function Stars({ rating }) {
  const max = 5;
  const filled = Math.round(Number(rating) || 0);
  return (
    <div className="rv-rating" title={`${rating || 0} / ${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`rv-star ${i < filled ? 'filled' : 'empty'}`}>★</span>
      ))}
    </div>
  );
}

function ReviewsPage() {
  const [reviews, setReviews]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await reviewsAPI.getReviews();
        setReviews(data.results || data || []);
      } catch (err) {
        console.error('Failed to fetch reviews', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleAction = async (id, action) => {
    setActionLoading((prev) => ({ ...prev, [id]: action }));
    try {
      if (action === 'approve') await reviewsAPI.approveReview(id);
      else                      await reviewsAPI.rejectReview(id);
      setReviews((prev) =>
        prev.map((r) =>
          (r.review_id === id) ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r
        )
      );
    } catch (err) {
      console.error(`Failed to ${action} review`, err);
    } finally {
      setActionLoading((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  const filtered = reviews.filter((r) => {
    if (activeFilter === 'All') return true;
    return r.status?.toLowerCase().replace('_', ' ') === activeFilter.toLowerCase();
  });

  const total    = reviews.length;
  const approved = reviews.filter((r) => r.status === 'approved').length;
  const pending  = reviews.filter((r) => !r.status || r.status === 'pending').length;
  const needsRev = reviews.filter((r) => r.status === 'needs_revision').length;

  return (
    <div className="reviews-page">
      <div className="rv-header">
        <div>
          <h1>Log Reviews</h1>
          <p>Manage and track weekly log review decisions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="rv-stats">
        {[
          { label: 'Total',          value: total },
          { label: 'Approved',       value: approved },
          { label: 'Pending',        value: pending },
          { label: 'Needs Revision', value: needsRev },
        ].map(({ label, value }) => (
          <div className="rv-stat-card" key={label}>
            <div className="rv-stat-label">{label}</div>
            <div className="rv-stat-value">{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rv-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`rv-filter-chip${activeFilter === f ? ' active' : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner text="Loading reviews…" />
      ) : (
        <div className="rv-table-wrapper">
          <table className="rv-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Log Week</th>
                <th>Reviewer</th>
                <th>Status</th>
                <th>Rating</th>
                <th>Comments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="rv-empty">
                      <FiClipboard size={48} />
                      <p>No reviews found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((rv, idx) => {
                  const isActing = actionLoading[rv.review_id];
                  const done     = rv.status === 'approved' || rv.status === 'rejected';
                  return (
                    <tr key={rv.review_id || idx}>
                      <td>{idx + 1}</td>
                      <td><strong>Week {rv.log_details?.week_number ?? rv.log}</strong></td>
                      <td>{rv.reviewer_details?.first_name || `Reviewer #${rv.reviewer}`}</td>
                      <td>
                        <span className={`rv-status ${rv.status || 'pending'}`}>
                          {rv.status?.replace('_', ' ') || 'Pending'}
                        </span>
                      </td>
                      <td><Stars rating={rv.rating} /></td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rv.comments || <span style={{ color: '#9ca3af' }}>—</span>}
                      </td>
                      <td>
                        <div className="rv-action-group">
                          <button
                            className="rv-btn approve"
                            disabled={!!isActing || done}
                            onClick={() => handleAction(rv.review_id, 'approve')}
                          >
                            {isActing === 'approve' ? '…' : 'Approve'}
                          </button>
                          <button
                            className="rv-btn reject"
                            disabled={!!isActing || done}
                            onClick={() => handleAction(rv.review_id, 'reject')}
                          >
                            {isActing === 'reject' ? '…' : 'Reject'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ReviewsPage;