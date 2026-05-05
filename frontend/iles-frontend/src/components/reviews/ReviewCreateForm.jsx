import React, { useState } from 'react';
import './ReviewCreateForm.css';

const INITIAL_PAYLOAD = {
  comments: '',
  rating: 5,
  status: 'approved',
};

function ReviewCreateForm({
  canCreate,
  disabledReason,
  onSubmit,
  submitting = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const [payload, setPayload] = useState(INITIAL_PAYLOAD);

  const submit = async () => {
    await onSubmit(payload);
    setPayload(INITIAL_PAYLOAD);
    setExpanded(false);
  };

  if (!canCreate) {
    return (
      <div className="rcf-note" role="note">
        {disabledReason}
      </div>
    );
  }

  return (
    <div className="rcf-wrap">
      <button
        className="lp-btn-primary"
        type="button"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? 'Cancel' : 'Add Feedback'}
      </button>

      {expanded && (
        <div className="rcf-card">
          <div className="rcf-row">
            <label htmlFor="rcf-rating">Rating</label>
            <select
              id="rcf-rating"
              value={payload.rating}
              onChange={(e) => setPayload((p) => ({ ...p, rating: Number(e.target.value) }))}
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>{value} star{value > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>

          <div className="rcf-col">
            <label htmlFor="rcf-comments">Comments</label>
            <textarea
              id="rcf-comments"
              rows={4}
              value={payload.comments}
              onChange={(e) => setPayload((p) => ({ ...p, comments: e.target.value }))}
              placeholder="Write review feedback for the student"
            />
          </div>

          <div className="rcf-row">
            <label htmlFor="rcf-status">Decision</label>
            <select
              id="rcf-status"
              value={payload.status}
              onChange={(e) => setPayload((p) => ({ ...p, status: e.target.value }))}
            >
              <option value="approved">Approved</option>
              <option value="needs_revision">Needs revision</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <button
            className="lp-btn-primary"
            type="button"
            onClick={submit}
            disabled={submitting || !payload.comments.trim()}
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      )}
    </div>
  );
}

export default ReviewCreateForm;
