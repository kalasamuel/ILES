import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../../../services/endpoints'; 
import './ForgotPasswordPage.css';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
  e.preventDefault();
  setMessage('');
  setIsLoading(true);

  try {
    const data = await authAPI.forgotPassword(email);
    setMessage(data.message || 'Verification code sent to your email.');
    setMessageType('success');
  } catch (err) {
    const msg = err?.response?.data?.error || 'Failed to send verification code. Please try again.';
    setMessage(msg);
    setMessageType('error');
  } finally {
    setIsLoading(false);
  }
};

  return (
    <>
      {/* ── Navbar ── */}
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <div className="navbar-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3.33 1.67 8.67 1.67 12 0v-5"/>
            </svg>
          </div>
          <span className="navbar-title">ILES</span>
        </Link>
        <div className="navbar-actions">
          <Link to="/login" className="btn-ghost">Login</Link>
          <Link to="/register" className="btn-register">Register</Link>
        </div>
      </nav>

      {/* ── Page ── */}
      <main className="forgot-password-page">

        {/* Hero */}
        <div className="forgot-password-hero">
          <div className="hero-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3.33 1.67 8.67 1.67 12 0v-5"/>
            </svg>
          </div>
          <h1 className="hero-title">Internship Logging &amp; Evaluation</h1>
          <p className="hero-subtitle">Password Recovery Portal</p>
        </div>

        {/* Card */}
        <div className="forgot-password-form-container">
          <div className="card-body">
            <h2>Forgot Password?</h2>
            <p className="card-description">
              Enter your registered email below. We'll send you instructions on how to securely reset your password.
            </p>

            <form onSubmit={handleSubmit} className="forgot-password-form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="M2 7l10 7 10-7"/>
                    </svg>
                  </span>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="name@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {message && (
                <div className={`message ${messageType}`}>{message}</div>
              )}

              <button type="submit" disabled={isLoading} className="btn-primary">
                {isLoading ? (
                  <>
                    <span className="spinner" />
                    Sending…
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </button>
            </form>
          </div>

          <div className="card-footer">
            <Link to="/login" className="back-btn">
              <div className="back-btn-left">
                <div className="back-arrow-circle">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 5l-7 7 7 7"/>
                  </svg>
                </div>
                <div className="back-btn-text">
                  <span className="back-btn-label">Back to Login</span>
                  <span className="back-btn-sub">Return to your account</span>
                </div>
              </div>
              <span className="back-btn-badge">Login</span>
            </Link>
          </div>
        </div>

        {/* Help */}
        <p className="page-help">
          Don't have access to your email?{' '}
          <a href="mailto:helpdesk@university.edu">Contact the University IT Helpdesk</a>
        </p>
      </main>

      {/* ── Footer ── */}
      <footer className="site-footer">
        © 2026 Internship Logging &amp; Evaluation System. All rights reserved.
      </footer>
    </>
  );
}

export default ForgotPasswordPage;