import React from 'react';
import { Link } from 'react-router-dom';
import './StaticPage.css';

function TermsPage() {
  return (
    <div className="static-page">
      <div className="static-page-inner">
        <Link to="/" className="sp-back-link">← Back to Home</Link>

        <h1>Terms of Service</h1>
        <p className="sp-updated">Last updated: April 2026</p>

        <p>
          Welcome to the Internship Logging &amp; Evaluation System (ILES). By accessing or
          using this platform, you agree to the following terms and conditions.
        </p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By registering for and using ILES, you acknowledge that you have read, understood,
          and agree to be bound by these Terms of Service. If you do not agree, you must not
          use the platform.
        </p>

        <h2>2. User Accounts</h2>
        <ul>
          <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
          <li>You must provide accurate and current information during registration.</li>
          <li>You must not share your account or allow others to access it.</li>
          <li>You must notify the administrator immediately of any unauthorised access.</li>
        </ul>

        <h2>3. Acceptable Use</h2>
        <p>When using ILES, you agree not to:</p>
        <ul>
          <li>Submit false, misleading, or plagiarised log entries</li>
          <li>Attempt to access other users' accounts or data</li>
          <li>Upload malicious files or content</li>
          <li>Interfere with the platform's operation or security</li>
          <li>Use the platform for any purpose other than internship management</li>
        </ul>

        <h2>4. Intellectual Property</h2>
        <p>
          ILES and its original content, features, and functionality are owned by the
          institution and are protected by applicable intellectual property laws. Content
          you submit (logs, reports) remains yours, but you grant the institution a licence
          to use it for academic and evaluation purposes.
        </p>

        <h2>5. Supervisor Responsibilities</h2>
        <ul>
          <li>Review submitted logs in a timely manner</li>
          <li>Provide constructive and fair feedback</li>
          <li>Maintain confidentiality of student information</li>
          <li>Use evaluation tools fairly and consistently</li>
        </ul>

        <h2>6. Limitation of Liability</h2>
        <p>
          ILES is provided "as is" without warranties of any kind. The institution shall not
          be liable for any indirect, incidental, or consequential damages arising from
          your use of the platform.
        </p>

        <h2>7. Termination</h2>
        <p>
          The institution reserves the right to suspend or terminate accounts that violate
          these terms. You may request for account deletion by contacting the administrator.
        </p>

        <hr className="sp-divider" />

        <h2>8. Contact</h2>
        <p>
          Questions about these Terms? Contact us at {' '}
          <a href="mailto:support@iles.ac.ug">support@iles.ac.ug</a>.
        </p>
      </div>
    </div>
  );
}

export default TermsPage;
