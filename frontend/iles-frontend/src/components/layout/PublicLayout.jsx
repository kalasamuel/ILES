import React from 'react';
import { Outlet } from 'react-router-dom';

function PublicLayout() {
  return (
    <div className="public-layout">
      <header className="public-header">
        <nav>
          <div className="logo">ILES</div>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/login">Login</a></li>
            <li><a href="/register">Register</a></li>
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