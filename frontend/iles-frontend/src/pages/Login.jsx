import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/AuthContext';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(formData.email, formData.password);
      navigate('/app/dashboard');
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">

      {/* ── Hero / Header ── */}
      <div className="login-header">
        <Link to="/" className="login-logo-link">
          <div className="login-logo">
            <div className="login-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3.33 1.67 8.67 1.67 12 0v-5" />
              </svg>
            </div>
            <span className="login-logo-text">ILES</span>
          </div>
        </Link>
        <h1 className="login-title">Welcome Back</h1>
        <p className="login-subtitle">Internship Logging &amp; Evaluation</p>
      </div>

      {/* ── Card ── */}
      <div className="login-card">

        <h2>Sign In</h2>
        <p className="login-card-subtitle">Enter your credentials to continue</p>

        <form onSubmit={handleSubmit}>

          {/* Email */}
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
                value={formData.email}
                onChange={handleChange}
                placeholder="name@university.edu"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <div className="form-group-header">
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" className="forgot-password">Forgot password?</Link>
            </div>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <label className="remember-me">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember me for 30 days</span>
          </label>

          {/* Error */}
          {error && <div className="error-message">{error}</div>}

          {/* Submit */}
          <button type="submit" className="btn-signin" disabled={isLoading}>
            {isLoading ? (
              <><span className="spinner" /> Signing in…</>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Register */}
          <div className="login-register">
            Don't have an account?{' '}
            <Link to="/register">Create one</Link>
          </div>

        </form>

        {/* ── Back to Home — same styled button as ForgotPassword ── */}
        <div className="back-to-home-container">
          <Link to="/" className="back-to-home">
            <div className="back-btn-left">
              <div className="back-arrow-circle">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
              </div>
              <div className="back-btn-text">
                <span className="back-btn-label">Back to Home</span>
                <span className="back-btn-sub">Return to the main page</span>
              </div>
            </div>
            <span className="back-btn-badge">Home</span>
          </Link>
        </div>

      </div>

      {/* ── Footer ── */}
      <footer className="login-footer">
        <div>© 2026 ILES. All rights reserved.</div>
        <div className="login-footer-links">
          <Link to="/privacy">Privacy Policy</Link>
          <span className="login-footer-divider">•</span>
          <Link to="/terms">Terms of Service</Link>
          <span className="login-footer-divider">•</span>
          <Link to="/contact">Contact</Link>
        </div>
      </footer>

    </div>
  );
};

export default Login;