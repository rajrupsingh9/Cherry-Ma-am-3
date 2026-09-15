import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register PWA Service Worker for instant caching & offline support
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registered successfully with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  });
} else if ('serviceWorker' in navigator) {
  // Also register in dev preview mode if supported
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// 📱 Native Mobile App Touch Ergonomics: Prevent pinch-to-zoom and viewport scaling
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // 1. Prevent multi-touch pinch zoom (2 or more fingers touching screen)
  document.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // 2. Prevent WebKit/Safari native pinch gesture scaling
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());
  document.addEventListener('gestureend', (e) => e.preventDefault());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

