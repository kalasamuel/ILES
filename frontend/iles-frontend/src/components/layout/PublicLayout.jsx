import React from 'react';
import { Outlet, Link } from 'react-router-dom';

function PublicLayout() {
  return (
    <div className="public-layout">
      <header className="public-header">
        <nav>
          <div className="logo">ILES</div>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/register">Register</Link></li>
          </ul>
        </nav>
      </header>

      <main className="public-main">
        <Outlet />
      </main>

      <footer className="public-footer">
        <p>&copy; 2024 ILES - Internship Log and Evaluation System</p>
      </footer>
    </div>
  );
}

export default PublicLayout;