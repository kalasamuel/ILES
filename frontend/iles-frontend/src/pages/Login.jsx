import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/AuthContext';
import './Login.css';

const Login = () => {
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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);
      // Navigate to dashboard (note: it's /app/dashboard in your router)
      navigate('/app/dashboard');
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">

      {/* HEADER */}
      <div className="login-header">
        <Link to="/" className="login-logo-link" style={{ textDecoration: 'none' }}>
          <div className="login-logo">
            <div className="login-logo-icon">
              <svg viewBox="0 0 24 24">
                <path d="M12 2L2 7v10l10 5 10-5V7l-10-5z" />
                <path d="M12 12l4-2v4l-4 2-4-2v-4l4 2z" fill="white" />
              </svg>
            </div>
            <span className="login-logo-text">ILES</span>
          </div>
        </Link>
        <h1 className="login-title">Welcome Back</h1>
        <p className="login-subtitle">Sign in to access your account</p>
      </div>

      {/* LOGIN CARD */}
      <div className="login-card">
        {/* Back to Home Link */}
        <div className="back-to-home-container">
          <Link to="/" className="back-to-home">
            ← Back to Home
          </Link>
        </div>
        
        <h2>Sign In</h2>
        <p className="login-card-subtitle">Enter your credentials to continue</p>

        <form onSubmit={handleSubmit}>

          {/* EMAIL */}
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <div className="input-wrapper">
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

          {/* PASSWORD */}
          <div className="form-group">
            <div className="form-group-header">
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" className="forgot-password">
                Forgot password?
              </Link>
            </div>

            <div className="input-wrapper">
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

          {/* REMEMBER ME */}
          <label className="remember-me">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember me for 30 days</span>
          </label>

          {/* ERROR */}
          {error && <div className="error-message">{error}</div>}

          {/* BUTTON */}
          <button type="submit" className="btn-signin" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>

          {/* REGISTER LINK */}
          <div className="login-register">
            Don't have an account?{' '}
            <Link to="/register">Register</Link>
          </div>

        </form>
      </div>

      {/* FOOTER */}
      <footer className="login-footer">
        <div>© 2024 ILES. All rights reserved.</div>
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