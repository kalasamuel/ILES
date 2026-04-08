import React from 'react';
import './LoadingSpinner.css';

function LoadingSpinner({ size = 'md', text = 'Loading...', fullscreen = false }) {
  return (
    <div className={`loading-spinner-wrapper${fullscreen ? ' fullscreen' : ''}`}>
      <div className={`loading-spinner ${size}`} role="status" aria-label="Loading" />
      {text && <p className="loading-spinner-text">{text}</p>}
    </div>
  );
}

export default LoadingSpinner;
