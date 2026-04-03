import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/AuthContext';

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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      
      {/* Header */}
      <div className="mb-8 text-center space-y-2">
        <Link to="/" className="inline-flex items-center justify-center p-3 bg-zinc-950 rounded-xl mb-4 hover:scale-105 transition-transform">
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3.33 1.67 8.67 1.67 12 0v-5" />
          </svg>
        </Link>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-950">Welcome Back</h1>
        <p className="text-zinc-500">Internship Logging &amp; Evaluation System</p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white border border-zinc-200 shadow-xl shadow-zinc-200/50 rounded-3xl p-8">
        
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-zinc-900 tracking-tight">Sign In</h2>
          <p className="text-sm text-zinc-500 mt-1">Enter your credentials below to access your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Email Address
            </label>
            <div className="relative">
              <svg className="absolute left-3 top-3 h-5 w-5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M2 7l10 7 10-7"/>
              </svg>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@university.edu"
                className="flex h-11 w-full rounded-md border border-zinc-300 bg-transparent pl-10 px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium leading-none whitespace-nowrap">
                Password
              </label>
              <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-500 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <svg className="absolute left-3 top-3 h-5 w-5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="flex h-11 w-full rounded-md border border-zinc-300 bg-transparent pl-10 pr-10 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
              <button
                type="button"
                className="absolute right-1 top-1 bottom-1 px-3 flex items-center text-zinc-400 hover:text-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-950"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="remember"
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-950"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="remember" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Remember me for 30 days
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 text-sm font-medium bg-red-50 text-red-600 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isLoading}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50 bg-zinc-900 text-zinc-50 hover:bg-zinc-900/90 h-11 w-full"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
          
          <div className="text-center text-sm text-zinc-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-zinc-900 hover:text-zinc-700 hover:underline">
              Create one
            </Link>
          </div>
        </form>

        <div className="mt-8 border-t border-zinc-200 pt-6 group">
          <Link to="/" className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-100 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-200/60 group-hover:bg-zinc-200 transition-colors">
                <svg className="w-4 h-4 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
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

      </div>

      <footer className="mt-12 text-center text-sm text-zinc-500 flex flex-col items-center gap-2">
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