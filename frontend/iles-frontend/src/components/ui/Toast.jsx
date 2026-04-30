/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiX, FiXCircle } from 'react-icons/fi';
import './Toast.css';

// ── Icons ──────────────────────────────────────────────────────────────────
const CheckIcon = () => (
  <FiCheckCircle className="toast-icon" />
);
const XCircleIcon = () => (
  <FiXCircle className="toast-icon" />
);
const AlertIcon = () => (
  <FiAlertTriangle className="toast-icon" />
);
const InfoIcon = () => (
  <FiInfo className="toast-icon" />
);
const CloseIcon = () => (
  <FiX size={14} />
);

const iconMap = { success: CheckIcon, error: XCircleIcon, warning: AlertIcon, info: InfoIcon };

// ── Context ────────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timerRef = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 280);
  }, []);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, title, message, duration, exiting: false }]);
    if (duration > 0) {
      timerRef.current[id] = setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const toast = {
    success: (title, message, opts) => addToast({ type: 'success', title, message, ...opts }),
    error:   (title, message, opts) => addToast({ type: 'error',   title, message, ...opts }),
    warning: (title, message, opts) => addToast({ type: 'warning', title, message, ...opts }),
    info:    (title, message, opts) => addToast({ type: 'info',    title, message, ...opts }),
    dismiss,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container" role="region" aria-label="Notifications">
        {toasts.map(({ id, type, title, message, duration, exiting }) => {
          const Icon = iconMap[type] || InfoIcon;
          return (
            <div key={id} className={`toast ${type}${exiting ? ' exiting' : ''}`} role="alert">
              <Icon />
              <div className="toast-body">
                {title   && <span className="toast-title">{title}</span>}
                {message && <span className="toast-message">{message}</span>}
              </div>
              <button className="toast-close" onClick={() => dismiss(id)} aria-label="Dismiss">
                <CloseIcon />
              </button>
              {duration > 0 && (
                <div
                  className="toast-progress"
                  style={{ animationDuration: `${duration}ms` }}
                />
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export default ToastProvider;
