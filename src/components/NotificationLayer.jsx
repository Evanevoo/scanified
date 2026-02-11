import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children in a portal attached to document.body with a very high z-index.
 * Ensures notifications (Snackbars, Toasts, etc.) always appear above the sidebar and other fixed elements.
 */
export default function NotificationLayer({ children }) {
  const [container, setContainer] = useState(null);

  useEffect(() => {
    let el = document.getElementById('notification-layer');
    if (!el) {
      el = document.createElement('div');
      el.id = 'notification-layer';
      el.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 99999;
        pointer-events: none;
      `;
      document.body.appendChild(el);
    }
    setContainer(el);
  }, []);

  if (!container) return null;

  return createPortal(children, container);
}
