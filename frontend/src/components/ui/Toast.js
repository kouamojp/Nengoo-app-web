import React, { useEffect, useRef } from 'react';
import './Toast.css'; // We will create this CSS file next

const Toast = ({ message, type, onClose }) => {
  const timerRef = useRef(null);

  useEffect(() => {
    if (message) {
      timerRef.current = setTimeout(() => {
        onClose();
      }, 3000); // Auto-close after 3 seconds
    }

    return () => {
      clearTimeout(timerRef.current);
    };
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className={`toast-container toast-${type} w-[90%]`}>
      <div className="toast-message">{message}</div>
      <button className="toast-close" onClick={onClose}>
        &times;
      </button>
    </div>
  );
};

export default Toast;
