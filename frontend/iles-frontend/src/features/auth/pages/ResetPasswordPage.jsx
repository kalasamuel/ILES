import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../../services/endpoints'; // adjust path
import './ResetPasswordPage.css';

function ResetPasswordPage() {
  const navigate = useNavigate();

  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!verificationCode.trim()) {
      setMessage('Verification code is required.');
      setMessageType('error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.');
      setMessageType('error');
      return;
    }
    if (newPassword.length < 8) {
      setMessage('Password must be at least 8 characters.');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    try {
      const data = await authAPI.resetPassword(verificationCode, newPassword, confirmPassword);
      setMessage(data.message || 'Password reset successfully!');
      setMessageType('success');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      const msg = err?.response?.data?.error || 'Reset failed. The code may have expired.';
      setMessage(msg);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <span className="navbar-title">ILES</span>
        </Link>
      </nav>

      <main className="forgot-password-page">
        <div className="forgot-password-hero">
          <h1 className="hero-title">Reset Your Password</h1>
          <p className="hero-subtitle">Enter the code sent to your email</p>
        </div>

        <div className="forgot-password-form-container">
          <div className="card-body">
            <h2>Verification Code</h2>
            <p className="card-description">Enter the code from your email and choose a new password.</p>

            <form onSubmit={handleSubmit} className="forgot-password-form">
              <div className="form-group">
                <label htmlFor="verification-code">Verification Code</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="verification-code"
                    placeholder="Enter the 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="new-password">New Password</label>
                <div className="input-wrapper">
                  <input
                    type="password"
                    id="new-password"
                    placeholder="Minimum 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password">Confirm Password</label>
                <div className="input-wrapper">
                  <input
                    type="password"
                    id="confirm-password"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {message && (
                <div className={`message ${messageType}`}>{message}</div>
              )}

              <button type="submit" disabled={isLoading} className="btn-primary">
                {isLoading ? <><span className="spinner" /> Resetting…</> : 'Reset Password'}
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
      </main>

      <footer className="site-footer">
        © 2026 Internship Logging &amp; Evaluation System. All rights reserved.
      </footer>
    </>
  );
}

export default ResetPasswordPage;