// Silenciar Unhandled Rejection de Vite HMR y advertencias de deprecación de THREE.Clock
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    if (
      msg.includes('WebSocket closed without opened') ||
      msg.includes('failed to connect to websocket') ||
      msg.includes('vite:ws') ||
      msg.includes('THREE.Clock')
    ) {
      return; // Ignorar logs de desconexión de Vite HMR y THREE.Clock
    }
    originalConsoleError.apply(console, args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    if (
      msg.includes('THREE.Clock') ||
      msg.includes('Clock: This module has been deprecated') ||
      msg.includes('WebSocket closed without opened')
    ) {
      return; // Silenciar advertencias de deprecación de THREE.Clock
    }
    originalConsoleWarn.apply(console, args);
  };

  const isViteWSError = (err: any) => {
    if (!err) return false;
    const str = typeof err === 'string' 
      ? err 
      : (err.message || err.reason || err.type || String(err));
    return str.includes('WebSocket closed without opened') || str.includes('failed to connect to websocket') || str.includes('THREE.Clock');
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isViteWSError(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
    }
  }, true);

  window.addEventListener('error', (event) => {
    if (isViteWSError(event.error) || isViteWSError(event.message)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
    }
  }, true);
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './index.css';
import { initDragToScroll } from './lib/dragToScroll';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { registerServiceWorker } from './services/notificationService';

// Automatically register Service Worker for PWA & Push Notifications
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    registerServiceWorker().catch(err => console.error('[SW] Registration failed:', err));
  });
}

// Defensive patch for Leaflet to prevent 'Cannot read properties of undefined (reading _leaflet_pos)'
if (typeof window !== 'undefined' && L && L.DomUtil) {
  const origGetPosition = L.DomUtil.getPosition;
  L.DomUtil.getPosition = function (el: any) {
    if (!el) return new L.Point(0, 0);
    try {
      return origGetPosition ? origGetPosition.call(L.DomUtil, el) : (el._leaflet_pos || new L.Point(0, 0));
    } catch {
      return new L.Point(0, 0);
    }
  };

  const origSetPosition = L.DomUtil.setPosition;
  L.DomUtil.setPosition = function (el: any, point: any) {
    if (!el) return;
    try {
      if (origSetPosition) {
        origSetPosition.call(L.DomUtil, el, point);
      } else {
        el._leaflet_pos = point;
      }
    } catch {
      // ignore
    }
  };
}

// Enable global click-and-drag scroll on all table containers
initDragToScroll();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);


