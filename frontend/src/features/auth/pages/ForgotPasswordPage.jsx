import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    try {
      // TODO: Implement forgot password API call
      console.log('Forgot password for:', email);
      setMessage('Password reset instructions sent to your email');
    } catch (err) {
      setMessage('Failed to send reset instructions');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-form-container">
        <h2>Forgot Password</h2>
        <form onSubmit={handleSubmit} className="forgot-password-form">
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {message && <div className="message">{message}</div>}
          <button type="submit" disabled={isLoading} className="btn btn-primary">
            {isLoading ? 'Sending...' : 'Send Reset Instructions'}
          </button>
        </form>
        <div className="forgot-password-links">
          <Link to="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;