// 🔧 Scroll Diagnostic Script - Run this in browser console to diagnose scroll issues
// This helps identify what's blocking scrolling

(function() {
  console.log('🔍 Scroll Diagnostic Starting...\n');
  
  // Check body styles
  console.log('📋 BODY STYLES:');
  console.log('  overflow:', document.body.style.overflow || '(not set)');
  console.log('  position:', document.body.style.position || '(not set)');
  console.log('  top:', document.body.style.top || '(not set)');
  console.log('  width:', document.body.style.width || '(not set)');
  
  // Check computed styles
  const bodyComputed = window.getComputedStyle(document.body);
  console.log('\n📋 COMPUTED BODY STYLES:');
  console.log('  overflow:', bodyComputed.overflow);
  console.log('  overflow-y:', bodyComputed.overflowY);
  console.log('  overflow-x:', bodyComputed.overflowX);
  console.log('  position:', bodyComputed.position);
  
  // Check html styles
  const htmlComputed = window.getComputedStyle(document.documentElement);
  console.log('\n📋 COMPUTED HTML STYLES:');
  console.log('  overflow:', htmlComputed.overflow);
  console.log('  overflow-y:', htmlComputed.overflowY);
  console.log('  overflow-x:', htmlComputed.overflowX);
  
  // Check App container
  const app = document.querySelector('.App');
  if (app) {
    const appComputed = window.getComputedStyle(app);
    console.log('\n📋 COMPUTED .App STYLES:');
    console.log('  overflow:', appComputed.overflow);
    console.log('  overflow-y:', appComputed.overflowY);
    console.log('  height:', appComputed.height);
    console.log('  max-height:', appComputed.maxHeight);
  }
  
  // Check for visible modals
  const visibleModals = document.querySelectorAll(
    '[class*="modal-overlay"]:not([style*="display: none"]), ' +
    '[class*="modal-overlay"]:not([style*="display:none"]), ' +
    '.composer-modal-overlay:not([style*="display: none"]), ' +
    '.composer-modal-overlay:not([style*="display:none"])'
  );
  console.log('\n📋 VISIBLE MODALS:', visibleModals.length);
  visibleModals.forEach((modal, i) => {
    console.log(`  Modal ${i + 1}:`, modal.className);
  });
  
  // Check body classes
  console.log('\n📋 BODY CLASSES:', document.body.className || '(none)');
  
  // Check if ScrollSafety is in DOM
  console.log('\n📋 SCROLLSAFETY STATUS:');
  const scrollSafetyExists = document.querySelector('[data-scrollsafety]');
  console.log('  ScrollSafety element found:', !!scrollSafetyExists);
  
  // Try to fix immediately
  console.log('\n🔧 ATTEMPTING IMMEDIATE FIX:');
  const hadOverflowHidden = document.body.style.overflow === 'hidden';
  const hadPositionFixed = document.body.style.position === 'fixed';
  
  if (hadOverflowHidden || hadPositionFixed) {
    console.log('  ⚠️ Found stuck styles - resetting...');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    console.log('  ✅ Reset complete! Try scrolling now.');
  } else {
    console.log('  ℹ️ No stuck inline styles found on body');
  }
  
  console.log('\n✅ Diagnostic complete!');
})();
