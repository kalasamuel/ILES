import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { contactAPI } from '../services/endpoints';
import './ContactPage.css';

function ContactPage() {
  const [form, setForm]   = useState({ name: '', email: '', subject: 'General Inquiry', message: '' });
  const [isSubmitting, setIsSub] = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsSub(true);

    try {
      await contactAPI.submitMessage({
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
      });

      setSuccess(true);
      setForm({ name: '', email: '', subject: 'General Inquiry', message: '' });
    } catch (err) {
      const backendError = err?.response?.data?.detail || err?.response?.data?.message;
      setError(backendError || 'Failed to send your message. Please try again in a moment.');
    } finally {
      setIsSub(false);
    }
  };

  return (
    <div className="contact-page">
      <div className="contact-inner">
        <Link to="/" className="sp-back-link">← Back to Home</Link>

        <header className="contact-header">
          <h1>Contact Us</h1>
          <p>Have questions or facing issues? We're here to help you.</p>
        </header>

        {/* info cards */}
        <div className="contact-cards">
          <div className="contact-card">
            <div className="contact-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 17.15l-3.3-1.09a1.09 1.09 0 0 0-1.12.26l-1.3 1.3a14.4 14.4 0 0 1-6.6-6.6l1.3-1.3a1.09 1.09 0 0 0 .26-1.12L10.25 5.2a1.1 1.1 0 0 0-1.12-.26C8.25 5 7.15 5.5 6.4 6.25A9.33 9.33 0 0 0 6 12a14.4 14.4 0 0 0 6 6 9.33 9.33 0 0 0 5.75-.4c.75-.75 1.25-1.85 1.25-2.73a1.1 1.1 0 0 0-.25-1.12z" />
              </svg>
            </div>
            <h3>Call Us</h3>
            <p>Our support line is open Monday to Friday, 9am - 5pm.</p>
            <a href="tel:+256414123456">+256 414 123456</a>
          </div>

          <div className="contact-card">
            <div className="contact-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h3>Email Us</h3>
            <p>Email your queries and we'll respond within 24 hours.</p>
            <a href="mailto:support@iles.ac.ug">support@iles.ac.ug</a>
          </div>

          <div className="contact-card">
            <div className="contact-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3>FAQ</h3>
            <p>Check our frequently asked questions for quick answers.</p>
            <Link to="/help">Search FAQ →</Link>
          </div>
        </div>

        {/* The Contact Form */}
        <div className="contact-form-card">
          <h2>Send us a Message</h2>
          {success ? (
            <div className="cf-success">
              ✓ <strong>Success!</strong> Your message has been sent and we will get back to you shortly.
            </div>
          ) : (
            <form className="cf-form" onSubmit={handleSubmit}>
              {error && <div className="cf-error" role="alert">{error}</div>}
              <div className="cf-row">
                <div className="cf-field">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={form.name}
                    placeholder="e.g. John Doe"
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="cf-field">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={form.email}
                    placeholder="john@example.com"
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="cf-field">
                <label htmlFor="subject">Subject *</label>
                <select
                  id="subject"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                >
                  <option>General Inquiry</option>
                  <option>Technical Support</option>
                  <option>Account Access</option>
                  <option>Placement Dispute</option>
                  <option>Bug Report</option>
                </select>
              </div>
              <div className="cf-field">
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  required
                  rows={6}
                  value={form.message}
                  placeholder="How can we help you?"
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>
              <button type="submit" className="cf-submit" disabled={isSubmitting}>
                {isSubmitting ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContactPage;
