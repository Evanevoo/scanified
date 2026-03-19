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
      // Full-screen layer uses pointer-events: none so the app stays usable behind empty areas.
      // Direct children MUST use pointer-events: auto or buttons (cookie banner, toasts) are unclickable.
      el.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 99999;
        pointer-events: none;
      `;
      document.body.appendChild(el);
    }
    if (!document.getElementById('notification-layer-pointer-fix')) {
      const style = document.createElement('style');
      style.id = 'notification-layer-pointer-fix';
      style.textContent = `
        #notification-layer > * {
          pointer-events: auto;
        }
      `;
      document.head.appendChild(style);
    }
    setContainer(el);
  }, []);

  if (!container) return null;

  return createPortal(children, container);
}
