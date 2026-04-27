import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiAward, FiMail } from 'react-icons/fi';
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
            <FiAward size={20} />
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
            <FiAward size={30} />
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
                    <FiMail size={16} />
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
                  <FiArrowLeft size={15} />
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