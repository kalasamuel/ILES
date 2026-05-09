import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiAward, FiEye, FiEyeOff, FiLock, FiMail } from 'react-icons/fi';
import { useAuth } from '../hooks/AuthContext';
import './Login.css';

const REMEMBER_ME_KEY = 'iles_remembered_email';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // ── On mount: restore remembered email ──────────────────────────────────
  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBER_ME_KEY);
    if (savedEmail) {
      setFormData((prev) => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(formData.email, formData.password, rememberMe);

      // ── Remember Me: persist email for next visit ────────────────────────
      if (rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, formData.email);
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY);
      }

      navigate('/app/dashboard');
    } catch (err) {
      console.error('Login error details:', err);
      const backendError = err.response?.data?.detail || err.response?.data?.message;
      if (backendError) {
        setError(backendError);
      } else if (err.message === 'Network Error') {
        setError('Server unreachable. Please check your internet or contact support.');
      } else {
        setError('Login failed. Please verify your credentials and try again.');
      }
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
              <FiAward />
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
                <FiMail size={16} />
              </span>
              <input
                type="email"
                id="email"
                name="email"
                autoComplete="email"  
                value={formData.email}
                onChange={handleChange}
                placeholder="name@gmail.com"
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
                <FiLock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                autoComplete="current-password"
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
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
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

        {/* ── Back to Home ── */}
        <div className="back-to-home-container">
          <Link to="/" className="back-to-home">
            <div className="back-btn-left">
              <div className="back-arrow-circle">
                <FiArrowLeft size={15} />
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