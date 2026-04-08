import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './NotFoundPage.css';

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
      <div className="not-found-inner">
        <div className="not-found-code">404</div>
        <h1 className="not-found-title">Page Not Found</h1>
        <p className="not-found-msg">
          The page you're looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>
        <div className="not-found-actions">
          <button className="btn-nf-primary" onClick={() => navigate(-1)}>
            ← Go Back
          </button>
          <Link to="/" className="btn-nf-secondary">
            Home
          </Link>
          <Link to="/app/dashboard" className="btn-nf-secondary">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
