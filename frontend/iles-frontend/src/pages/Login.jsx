import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/AuthContext';
import './Login.css';

const Login = () => {
  console.log('Login render started');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    console.log('Input changed:', e.target.name);
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted');
    setError('');
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div style={{
        background: 'red',
        color: 'white',
        padding: '10px',
        margin: '10px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        textAlign: 'center'
      }}>
      </div>

      <div className="login-header">
        <div className="login-logo">
          <div className="login-logo-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2L2 7v10l10 5 10-5V7l-10-5z" />
              <path d="M12 12l4-2v4l-4 2-4-2v-4l4 2z" fill="white" />
            </svg>
          </div>
          <span className="login-logo-text">ILES</span>
        </div>
        <h1 className="login-title">Welcome Back</h1>
        <p className="login-subtitle">Sign in to access your account</p>
      </div>

      <div className="login-card">
        <h2>Sign In</h2>
        <p className="login-card-subtitle">Enter your credentials to continue</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
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

          <div className="form-group">
            <div className="form-group-header">
              <label htmlFor="password">Password</label>
              <a href="/forgot-password" className="forgot-password">Forgot password?</a>
            </div>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <label className="remember-me">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember me for 30 days</span>
          </label>

          {error && (
            <div className="error-message">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <circle cx="12" cy="16" r="0.5" fill="currentColor" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn-signin" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>

          <div className="login-register">
            Don't have an account yet? <a href="/register">Register Now</a>
          </div>
        </form>
      </div>

      <div className="support-notice">
        <svg className="support-notice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <circle cx="12" cy="8" r="0.5" fill="currentColor" />
        </svg>
        <div className="support-notice-body">
          <div className="support-notice-title">Support Notice</div>
          <div>
            If you are having trouble accessing your portal, please contact the Academic Internship Office at{' '}
            <a href="mailto:support@iles-system.edu">support@iles-system.edu</a> or visit our help center.
          </div>
        </div>
      </div>

      <footer className="login-footer">
        <div>© 2024 ILES. All rights reserved.</div>
        <div className="login-footer-links">
          <a href="/privacy">Privacy Policy</a>
          <span className="login-footer-divider">•</span>
          <a href="/terms">Terms of Service</a>
          <span className="login-footer-divider">•</span>
          <a href="/contact">Contact</a>
        </div>
      </footer>
    </div>
  );
};

export default Login;