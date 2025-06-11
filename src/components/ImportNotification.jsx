import React, { useState, useEffect } from 'react';
import { useImportProgress } from './ImportProgressContext';

export default function ImportNotification() {
  const { importing, progress, errors, status } = useImportProgress();
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState('success');
  const [notificationMessage, setNotificationMessage] = useState('');

  useEffect(() => {
    // Show notification when import completes (progress reaches 100% and importing becomes false)
    if (!importing && progress === 100 && status) {
      if (errors.length > 0) {
        setNotificationType('error');
        setNotificationMessage(`Import completed with ${errors.length} errors`);
      } else {
        setNotificationType('success');
        setNotificationMessage('Import completed successfully!');
      }
      setShowNotification(true);
      
      // Hide notification after 5 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 5000);
    }
  }, [importing, progress, status, errors]);

  if (!showNotification) return null;

  const bgColor = notificationType === 'success' ? 'bg-green-500' : 'bg-red-500';
  const icon = notificationType === 'success' ? '✓' : '✗';

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-4 py-3 rounded shadow-lg z-50 max-w-sm animate-slide-in`}>
      <div className="flex items-center">
        <div className="text-xl mr-3">{icon}</div>
        <div>
          <div className="font-semibold">
            {notificationType === 'success' ? 'Import Complete' : 'Import Issues'}
          </div>
          <div className="text-sm opacity-90">{notificationMessage}</div>
        </div>
        <button
          onClick={() => setShowNotification(false)}
          className="ml-4 text-white hover:text-gray-200"
        >
          ×
        </button>
      </div>
    </div>
  );
} 