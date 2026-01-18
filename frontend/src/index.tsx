import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// 🔧 IMMEDIATE FIX: Reset any stuck body overflow BEFORE React mounts
// This runs synchronously, before any React components, to ensure scroll always works
// This catches any overflow: hidden that was left from a previous session
if (document.body) {
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  document.body.style.pointerEvents = ''; // Ensure pointer events aren't blocked
}

// 🔧 WHEEL EVENT FIX: Ensure wheel events always scroll the page
// Chrome may capture wheel events on child elements but not convert them to page scroll
// This handler manually converts wheel events to page scrolling when needed
if (document.body) {
  const handleWheel = (e: WheelEvent) => {
    // Only handle if the event hasn't been prevented already
    if (e.defaultPrevented) return;
    
    // Check if the target element is scrollable (should handle its own scroll)
    const target = e.target as HTMLElement;
    if (!target) return;
    
    // Walk up the DOM tree to find if any parent is scrollable
    let element: HTMLElement | null = target;
    let foundScrollableParent = false;
    
    while (element && element !== document.body && element !== document.documentElement) {
      const style = window.getComputedStyle(element);
      const isScrollable = style.overflowY === 'auto' || 
                          style.overflowY === 'scroll' ||
                          style.overflow === 'auto' ||
                          style.overflow === 'scroll';
      
      if (isScrollable) {
        // Check if this scrollable element can actually scroll
        const canScroll = element.scrollHeight > element.clientHeight;
        if (canScroll) {
          foundScrollableParent = true;
          break;
        }
      }
      element = element.parentElement;
    }
    
    // If no scrollable parent was found, manually scroll the window
    // This fixes Chrome's issue where wheel events on non-scrollable elements don't scroll the page
    if (!foundScrollableParent) {
      const currentScrollY = window.scrollY;
      const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
      
      // Calculate new scroll position
      const scrollAmount = e.deltaY;
      const newScrollY = Math.max(0, Math.min(maxScrollY, currentScrollY + scrollAmount));
      
      // Only scroll if we're not already at the boundaries or if we can scroll further
      if ((scrollAmount < 0 && currentScrollY > 0) || 
          (scrollAmount > 0 && currentScrollY < maxScrollY)) {
        window.scrollTo({
          top: newScrollY,
          behavior: 'auto' // Use auto for immediate scroll, not smooth
        });
      }
    }
  };
  
  // Use capture phase to catch events early
  // We use passive: false so we can manually scroll when needed
  document.addEventListener('wheel', handleWheel, { 
    passive: false, // Need non-passive to manually scroll if needed
    capture: true 
  });
  
  // Also ensure body and html can receive pointer events
  document.body.style.pointerEvents = 'auto';
  document.documentElement.style.pointerEvents = 'auto';
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 🚀 Service Worker enabled for PWA updates!
// This enables offline caching and automatic update notifications
// When new code is deployed, users see a friendly "Update Available" banner
serviceWorkerRegistration.register();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
