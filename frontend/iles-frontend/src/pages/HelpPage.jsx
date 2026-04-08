import React, { useState } from 'react';
import './HelpPage.css';

const FAQ_DATA = [
  {
    q: 'How do I submit a weekly log?',
    a: 'Navigate to "My Logs" from the sidebar, click "+ New Log", fill in your activities, hours worked, challenges, and skills gained, then click "Submit". Your supervisor will be notified automatically.',
  },
  {
    q: 'What happens after I submit a log?',
    a: 'Once submitted, your workplace supervisor receives a notification to review it. They can approve, request revisions, or reject the log. You will be notified of the outcome.',
  },
  {
    q: 'How are my final grades calculated?',
    a: 'Your academic supervisor evaluates your performance using weighted criteria. Scores are computed automatically from evaluation criteria set by your institution, and a final grade is assigned.',
  },
  {
    q: 'How do I update my profile or password?',
    a: 'Go to "Settings" from the sidebar. You can update your personal information, change your password, and configure notification preferences from there.',
  },
  {
    q: 'Who do I contact if I have placement issues?',
    a: 'Reach out to your academic supervisor through the platform, or contact the system administrator using the support email provided in the Contact section below.',
  },
  {
    q: 'Can I edit a log after it has been submitted?',
    a: 'Once a log is submitted you cannot edit it directly. If your supervisor marks it as "Needs Revision", you will be able to make changes and resubmit.',
  },
];

const QUICK_LINKS = [
  {
    title: 'Getting Started',
    sub: 'First-time setup guide',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    title: 'Weekly Logs',
    sub: 'How to log activities',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    title: 'Reviews & Grades',
    sub: 'Understanding evaluations',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3.33 1.67 8.67 1.67 12 0v-5" />
      </svg>
    ),
  },
  {
    title: 'Account Settings',
    sub: 'Profile & preferences',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

function HelpPage() {
  const [openIdx, setOpenIdx] = useState(null);
  const [search, setSearch]   = useState('');

  const filteredFAQ = FAQ_DATA.filter(
    (f) =>
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="help-page">
      {/* Header */}
      <div className="hp-header">
        <h1>Help &amp; Support</h1>
        <p>Find answers, guides, and contact information to get the most out of ILES.</p>
      </div>

      {/* Search */}
      <div className="hp-search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search help articles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Quick Links */}
      <h2 className="hp-section-title">Quick Links</h2>
      <div className="hp-quick-links">
        {QUICK_LINKS.map((link) => (
          <div className="hp-quick-card" key={link.title}>
            <div className="hp-quick-icon">{link.icon}</div>
            <div>
              <div className="hp-quick-title">{link.title}</div>
              <div className="hp-quick-sub">{link.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <h2 className="hp-section-title">Frequently Asked Questions</h2>
      <div className="hp-faq-list">
        {filteredFAQ.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '14px', padding: '16px 0' }}>No matching questions found.</p>
        ) : (
          filteredFAQ.map((faq, i) => {
            const realIdx = FAQ_DATA.indexOf(faq);
            const isOpen  = openIdx === realIdx;
            return (
              <div className={`hp-faq-item${isOpen ? ' open' : ''}`} key={realIdx}>
                <button
                  className="hp-faq-q"
                  onClick={() => setOpenIdx(isOpen ? null : realIdx)}
                >
                  {faq.q}
                  <svg className="hp-faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div className="hp-faq-a">{faq.a}</div>
              </div>
            );
          })
        )}
      </div>

      {/* Contact */}
      <div className="hp-contact-card">
        <div>
          <h3>Still need help?</h3>
          <p>Our support team is available during working hours to assist you.</p>
        </div>
        <div className="hp-contact-actions">
          <a href="mailto:support@iles.ac.ug" className="hp-btn-primary">✉ Email Support</a>
          <a href="/contact" className="hp-btn-secondary">Contact Us</a>
        </div>
      </div>
    </div>
  );
}

export default HelpPage;