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
      <header className="login-header">
        <Link to="/" className="login-logo-link" aria-label="Go to home page">
          <div className="login-logo">
            <div className="login-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3.33 1.67 8.67 1.67 12 0v-5" />
              </svg>
            </div>
            <div className="login-logo-text">ILES</div>
          </div>
        </Link>
        <h1 className="login-title">Welcome back</h1>
        <p className="login-subtitle">Internship Logging &amp; Evaluation System</p>
      </header>

      <main className="login-card">
        <h2>Sign in</h2>
        <p className="login-card-subtitle">Enter your credentials below to access your dashboard.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <div className="input-wrapper">
              <div className="input-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M2 7l10 7 10-7" />
                </svg>
              </div>
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
              <Link to="/forgot-password" className="forgot-password">
                Forgot password?
              </Link>
            </div>
            <div className="input-wrapper">
              <div className="input-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <label className="remember-me" htmlFor="remember">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Remember me for 30 days
          </label>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={isLoading} className="btn-signin">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="spinner" />
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </button>

          <div className="login-register">
            Don't have an account? <Link to="/register">Create one</Link>
          </div>
        </form>

        <div className="mt-8 border-t border-zinc-200 pt-6 group">
          <Link to="/" className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-100 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-200/60 group-hover:bg-zinc-200 transition-colors">
                <svg className="w-4 h-4 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-zinc-900">Back to Home</span>
                <span className="text-xs text-zinc-500">Return to main page</span>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
              Home
            </span>
          </Link>
        </div>
      </main>

      <footer className="mt-2 text-center text-sm text-zinc-500 flex flex-col items-center gap-2">
        <p>© 2026 ILES. All rights reserved.</p>
        <div className="flex items-center space-x-2">
          <Link to="/privacy" className="hover:text-zinc-800 hover:underline">Privacy</Link>
          <span>&bull;</span>
          <Link to="/terms" className="hover:text-zinc-800 hover:underline">Terms</Link>
          <span>&bull;</span>
          <Link to="/contact" className="hover:text-zinc-800 hover:underline">Contact</Link>
        </div>
      </footer>
    </div>
  );
};

export default Login;