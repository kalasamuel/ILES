import React from 'react';
import { Link } from 'react-router-dom';
import './StaticPage.css';

function PrivacyPage() {
  return (
    <div className="static-page">
      <div className="static-page-inner">
        <Link to="/" className="sp-back-link">← Back to Home</Link>

        <h1>Privacy Policy</h1>
        <p className="sp-updated">Last updated: April 2026</p>

        <p>
          The Internship Logging &amp; Evaluation System (ILES) is committed to protecting
          your personal data. This Privacy Policy explains how we collect, use, and safeguard
          information when you use our platform.
        </p>

        <h2>1. Information We Collect</h2>
        <p>We collect information you provide when you register and use ILES:</p>
        <ul>
          <li>Personal details — name, email address, student/staff ID</li>
          <li>Academic data — department, programme, supervisor assignments</li>
          <li>Placement data — organisation details, position titles, dates</li>
          <li>Activity logs — weekly log entries, attachments, and comments</li>
          <li>Usage data — login timestamps, page views (for system health monitoring)</li>
        </ul>

        <h2>2. How We Use Your Data</h2>
        <ul>
          <li>To facilitate internship management, log submission, and evaluation workflows</li>
          <li>To generate academic reports and dashboards</li>
          <li>To send system notifications and deadline reminders</li>
          <li>To improve platform features and fix technical issues</li>
        </ul>

        <h2>3. Data Sharing</h2>
        <p>
          Your data is shared only within the scope of the internship programme — with your
          assigned supervisors, academic evaluators, and system administrators. We do not sell
          or share your personal data with external third parties.
        </p>

        <h2>4. Data Security</h2>
        <p>
          We use industry-standard security measures including encrypted connections (HTTPS),
          secure password hashing, and role-based access controls to protect your information.
        </p>

        <h2>5. Data Retention</h2>
        <p>
          Your data is retained for the duration of your academic programme plus one additional year
          for archival purposes. You may request data deletion by contacting the system administrator.
        </p>

        <h2>6. Your Rights</h2>
        <ul>
          <li>Access — request a copy of your personal data</li>
          <li>Correction — update inaccurate information via Settings</li>
          <li>Deletion — request removal of your account and associated data</li>
        </ul>

        <hr className="sp-divider" />

        <h2>7. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, please contact the system
          administrator at <a href="mailto:support@iles.ac.ug">support@iles.ac.ug</a>.
        </p>
      </div>
    </div>
  );
}

export default PrivacyPage;
