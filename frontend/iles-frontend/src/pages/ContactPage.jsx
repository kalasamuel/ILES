import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiInfo, FiMail, FiPhone } from 'react-icons/fi';
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
              <FiPhone size={20} />
            </div>
            <h3>Call Us</h3>
            <p>Our support line is open Monday to Friday, 9am - 5pm.</p>
            <a href="tel:+256414123456">+256 414 123456</a>
          </div>

          <div className="contact-card">
            <div className="contact-card-icon">
              <FiMail size={20} />
            </div>
            <h3>Email Us</h3>
            <p>Email your queries and we'll respond within 24 hours.</p>
            <a href="mailto:support@iles.ac.ug">support@iles.ac.ug</a>
          </div>

          <div className="contact-card">
            <div className="contact-card-icon">
              <FiInfo size={20} />
            </div>
            <h3>FAQ</h3>
            <p>Check out our frequently asked questions for quick answers.</p>
            <Link to="/help">Search FAQ →</Link>
          </div>
        </div>

        {/* The Contact Form */}
        <div className="contact-form-card">
          <h2>Send us a Message!</h2>
          {success ? (
            <div className="cf-success">
              ✓ <strong>Success!</strong> Your message has been sent! We will get back to you shortly.
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
                  <label htmlFor="email">Email Address*</label>
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
