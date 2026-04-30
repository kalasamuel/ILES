import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBarChart2, FiFileText, FiTrendingUp, FiUser } from 'react-icons/fi';
import { dashboardsAPI } from '../../../services/endpoints';
import landingPageImage from '../../../assets/landingpage.png';
import './LandingPage.css';

function LandingPage() {
  const [stats, setStats] = useState({
    students: null,
    companies: null,
    departments: null,
  });
  const [statsError, setStatsError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadPublicStats = async () => {
      try {
        const response = await dashboardsAPI.getPublicStats();
        if (!mounted) {
          return;
        }
        setStats({
          students: response.students_count ?? 0,
          companies: response.organizations_count ?? 0,
          departments: response.departments_count ?? 0,
        });
      } catch {
        if (!mounted) {
          return;
        }
        setStatsError('Live statistics are currently unavailable. Showing baseline values.');
      }
    };

    loadPublicStats();

    return () => {
      mounted = false;
    };
  }, []);

  const displayStudents = stats.students !== null ? `${stats.students.toLocaleString()}+` : '15k+';
  const displayCompanies = stats.companies !== null ? `${stats.companies.toLocaleString()}+` : '200+';
  const displayDepartments = stats.departments !== null ? `${stats.departments.toLocaleString()}+` : '50+';

  return (
    <div className="landing-page">

      {/* ── Navbar ── */}
      <nav className="landing-navbar">
        <Link to="/" className="navbar-logo">
          <div className="navbar-logo-icon">IL</div>
          ILES Internship System
        </Link>
        <div className="navbar-actions">
          <Link to="/login" className="btn-nav-login">Login</Link>
          <Link to="/register" className="btn-nav-register">Register</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Version 2.0 Now Live
          </div>
          <h1>
            Welcome to <em>ILES</em>
          </h1>
          <p>
            The Internship Logging &amp; Evaluation System provides a unified
            platform for students, supervisors, and faculty to manage internship
            lifecycles with precision and ease.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary">Get Started Today →</Link>
            <Link to="/login" className="btn btn-secondary">System Login</Link>
          </div>
          {statsError && <p className="hero-live-stats-note">{statsError}</p>}
          <div className="hero-stats">
            <div>
              <div className="hero-stat-value">{displayStudents}</div>
              <div className="hero-stat-label">Students</div>
            </div>
            <div>
              <div className="hero-stat-value">{displayCompanies}</div>
              <div className="hero-stat-label">Companies</div>
            </div>
            <div>
              <div className="hero-stat-value">{displayDepartments}</div>
              <div className="hero-stat-label">Departments</div>
            </div>
          </div>
        </div>

        <div className="hero-image-wrapper">
          <div className="hero-image-card">
            <img src={landingPageImage} alt="ILES landing page preview" />
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <div className="features-section">
        <div className="features-inner">

          <div className="section-header">
            <h2>Comprehensive Management</h2>
            <p>
              ILES automates the tedious parts of internship coordination,
              allowing everyone to focus on what matters: the learning experience.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-card-icon"><FiFileText size={20} /></div>
              <h3>Log Management</h3>
              <p>Track your internship activities and progress with structured weekly logs.</p>
            </div>
            <div className="feature-card">
              <div className="feature-card-icon"><FiUser size={20} /></div>
              <h3>Supervisor Reviews</h3>
              <p>Get feedback from workplace and academic supervisors in real-time.</p>
            </div>
            <div className="feature-card">
              <div className="feature-card-icon"><FiBarChart2 size={20} /></div>
              <h3>Evaluations</h3>
              <p>Comprehensive evaluation system for fair and consistent internship grading.</p>
            </div>
            <div className="feature-card">
              <div className="feature-card-icon"><FiTrendingUp size={20} /></div>
              <h3>Reports</h3>
              <p>Generate detailed reports and analytics across all departments.</p>
            </div>
          </div>

        </div>
      </div>

      {/* ── CTA ── */}
      <div className="cta-section">
        <h2>Ready to Streamline Your Internship Program?</h2>
        <p>
          Join hundreds of academic departments who have upgraded their
          evaluation processes with ILES.
        </p>
        <div className="cta-actions">
          <Link to="/register" className="btn-cta-primary">Create Your Account</Link>
          <Link to="/login" className="btn-cta-secondary">Member Login</Link>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="navbar-logo">
              <div className="navbar-logo-icon">IL</div>
              ILES
            </Link>
            <p>
              Empowering students and educational institutions with structured
              internship management and evaluation tools.
            </p>
          </div>
          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Support</h4>
            <ul>
              <li><a href="#">Documentation</a></li>
              <li><a href="#">Contact Sales</a></li>
              <li><a href="#">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Internship Logging &amp; Evaluation System. Building Academic Excellence.</p>
          <div className="footer-bottom-links">
            <a href="#">Terms of Service</a>
            <a href="#">Cookie Policy</a>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default LandingPage;