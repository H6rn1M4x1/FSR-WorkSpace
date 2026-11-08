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

// El dock flotante de Electron (ver electron/main.cjs) navega a esta misma app con
// "?mode=dock" en vez de crear un HTML/bundle separado — así comparte origen con la ventana
// principal sin esfuerzo extra.
const isDockMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'dock';

if (isDockMode) {
  document.documentElement.classList.add('dock-mode');
  import('./components/DockApp').then(({ default: DockApp }) => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ErrorBoundary>
          <DockApp />
        </ErrorBoundary>
      </StrictMode>,
    );
  });
} else {
  // Enable global click-and-drag scroll on all table containers
  initDragToScroll();

  // App.tsx (y por lo tanto src/lib/supabase.ts, que ese módulo importa) se cargan recién acá,
  // con un import() dinámico, en vez de un "import App from './App.tsx'" estático arriba del
  // archivo — un import estático se ejecuta igual aunque <App/> nunca se renderice, así que la
  // ventana del dock (que entra por la rama de arriba) terminaba igual evaluando supabase.ts y
  // creando su PROPIO cliente de Supabase, aunque nunca lo usara. Con dos clientes de Supabase
  // corriendo en paralelo contra la MISMA sesión guardada (mainWindow y dockWindow comparten
  // origen/localStorage), ambos intentaban refrescar el token al mismo tiempo apenas Windows
  // relanzaba la app sola al prender la PC — y si el proyecto tiene rotación de refresh token
  // (lo habitual en Supabase hoy), el segundo refresco en llegar pisa al primero con un error de
  // token ya usado, dejando la sesión invalidada de verdad. Evitar que el dock cargue supabase.ts
  // de arranque saca esa carrera de encima: el dock nunca necesitó su propio cliente, ya que toda
  // su data le llega por IPC desde la ventana principal.
  import('./App').then(({ default: App }) => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ErrorBoundary>
          <ToastProvider>
            <App />
          </ToastProvider>
        </ErrorBoundary>
      </StrictMode>,
    );
  });
}


