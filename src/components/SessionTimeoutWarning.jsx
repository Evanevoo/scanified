import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

/**
 * Session Timeout Warning Modal
 * Displays when user has been inactive and session is about to expire
 */
const SessionTimeoutWarning = () => {
  const { sessionTimeoutWarning, extendSession, signOut } = useAuth();
  const [countdown, setCountdown] = useState(120); // 2 minutes countdown
  
  // Reset countdown when warning appears
  useEffect(() => {
    if (sessionTimeoutWarning) {
      setCountdown(120);
    }
  }, [sessionTimeoutWarning]);
  
  // Countdown timer
  useEffect(() => {
    if (!sessionTimeoutWarning) return;
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [sessionTimeoutWarning]);
  
  // Format countdown as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleStayLoggedIn = () => {
    extendSession();
  };
  
  const handleLogout = async () => {
    await signOut();
  };
  
  if (!sessionTimeoutWarning) return null;
  
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Warning Icon */}
        <div style={styles.iconContainer}>
          <svg 
            width="48" 
            height="48" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#F59E0B" 
            strokeWidth="2"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        
        {/* Title */}
        <h2 style={styles.title}>Session Expiring Soon</h2>
        
        {/* Message */}
        <p style={styles.message}>
          You have been inactive for a while. For your security, you will be 
          logged out automatically in:
        </p>
        
        {/* Countdown */}
        <div style={styles.countdownContainer}>
          <span style={styles.countdown}>{formatTime(countdown)}</span>
        </div>
        
        {/* Buttons */}
        <div style={styles.buttonContainer}>
          <button 
            style={styles.primaryButton}
            onClick={handleStayLoggedIn}
          >
            Stay Logged In
          </button>
          <button 
            style={styles.secondaryButton}
            onClick={handleLogout}
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    animation: 'fadeIn 0.3s ease-out',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '400px',
    width: '90%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    animation: 'slideIn 0.3s ease-out',
  },
  iconContainer: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#FEF3C7',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '0 auto 20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1F2937',
    margin: '0 0 12px',
  },
  message: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#6B7280',
    margin: '0 0 24px',
  },
  countdownContainer: {
    border: '3px solid #EF4444',
    borderRadius: '12px',
    padding: '16px 32px',
    display: 'inline-block',
    marginBottom: '28px',
  },
  countdown: {
    fontSize: '40px',
    fontWeight: '700',
    color: '#EF4444',
    fontVariantNumeric: 'tabular-nums',
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  primaryButton: {
    backgroundColor: '#40B5AD',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    color: '#6B7280',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%',
  },
};

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideIn {
    from { 
      opacity: 0; 
      transform: translateY(-20px) scale(0.95);
    }
    to { 
      opacity: 1; 
      transform: translateY(0) scale(1);
    }
  }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(styleSheet);
}

export default SessionTimeoutWarning;
