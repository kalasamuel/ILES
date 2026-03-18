import React from 'react';
import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    <div className="landing-page">
      <div className="hero-section">
        <h1>Welcome to ILES</h1>
        <p>Internship Log and Evaluation System</p>
        <div className="hero-actions">
          <Link to="/login" className="btn btn-primary">Login</Link>
          <Link to="/register" className="btn btn-secondary">Register</Link>
        </div>
      </div>

      <div className="features-section">
        <h2>Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Log Management</h3>
            <p>Track your internship activities and progress</p>
          </div>
          <div className="feature-card">
            <h3>Supervisor Reviews</h3>
            <p>Get feedback from workplace and academic supervisors</p>
          </div>
          <div className="feature-card">
            <h3>Evaluations</h3>
            <p>Comprehensive evaluation system for internships</p>
          </div>
          <div className="feature-card">
            <h3>Reports</h3>
            <p>Generate detailed reports and analytics</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;