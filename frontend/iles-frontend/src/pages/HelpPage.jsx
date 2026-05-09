import React, { useState } from 'react';
import { FiAward, FiCheckCircle, FiChevronDown, FiFileText, FiSearch, FiSettings, FiMail } from 'react-icons/fi';
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
    icon: FiCheckCircle,
  },
  {
    title: 'Weekly Logs',
    sub: 'How to log activities',
    icon: FiFileText,
  },
  {
    title: 'Reviews & Grades',
    sub: 'Understanding evaluations',
    icon: FiAward,
  },
  {
    title: 'Account Settings',
    sub: 'Profile & preferences',
    icon: FiSettings,
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
        <FiSearch size={18} />
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
            <div className="hp-quick-icon"><link.icon size={20} /></div>
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
          filteredFAQ.map((faq) => {
            const realIdx = FAQ_DATA.indexOf(faq);
            const isOpen  = openIdx === realIdx;
            return (
              <div className={`hp-faq-item${isOpen ? ' open' : ''}`} key={realIdx}>
                <button
                  className="hp-faq-q"
                  onClick={() => setOpenIdx(isOpen ? null : realIdx)}
                >
                  {faq.q}
                  <FiChevronDown className="hp-faq-chevron" size={16} />
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
          <a href="mailto:support@iles.ac.ug" className="hp-btn-primary"><FiMail aria-hidden="true" /> Email Support</a>
          <a href="/contact" className="hp-btn-secondary">Contact Us</a>
        </div>
      </div>
    </div>
  );
}

export default HelpPage;