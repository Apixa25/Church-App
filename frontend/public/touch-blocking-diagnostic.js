// 🔍 Touch Blocking Diagnostic - Run in Chrome DevTools Console
// This checks for invisible overlays or elements that might be blocking touch events

(function() {
  console.log('🔍 TOUCH BLOCKING DIAGNOSTIC STARTING...\n');
  
  // Check all fixed/absolute positioned elements
  console.log('📋 CHECKING FOR BLOCKING ELEMENTS:');
  const allElements = document.querySelectorAll('*');
  const suspiciousElements = [];
  
  allElements.forEach(el => {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    
    // Check for fixed/absolute positioned elements that could block touches
    if ((style.position === 'fixed' || style.position === 'absolute') &&
        style.pointerEvents !== 'none' &&
        rect.width > 100 && 
        rect.height > 100) {
      
      const zIndex = parseInt(style.zIndex) || 0;
      const isVisible = style.display !== 'none' && 
                       style.visibility !== 'hidden' && 
                       parseFloat(style.opacity || '1') > 0.01;
      
      // Check if it's between bottom nav (z-index 1000) and content (lower z-index)
      if (zIndex > 1 && zIndex < 1000 && isVisible) {
        suspiciousElements.push({
          tag: el.tagName,
          className: el.className || '(no class)',
          id: el.id || '(no id)',
          zIndex: zIndex,
          pointerEvents: style.pointerEvents,
          position: style.position,
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left,
          element: el
        });
      }
    }
  });
  
  if (suspiciousElements.length > 0) {
    console.log(`⚠️ Found ${suspiciousElements.length} potentially blocking elements:`);
    suspiciousElements.sort((a, b) => b.zIndex - a.zIndex).forEach((item, i) => {
      console.log(`\n${i + 1}. <${item.tag}>`, {
        class: item.className,
        id: item.id,
        zIndex: item.zIndex,
        pointerEvents: item.pointerEvents,
        position: item.position,
        bounds: `(${item.left}, ${item.top}) - (${item.width}x${item.height})`
      });
      console.log('   Element:', item.element);
    });
  } else {
    console.log('✅ No obvious blocking overlays found');
  }
  
  // Check touch-action CSS on main containers
  console.log('\n📋 CHECKING TOUCH-ACTION ON MAIN CONTAINERS:');
  const containers = [
    document.body,
    document.querySelector('.App'),
    document.querySelector('.dashboard-container'),
    document.querySelector('.dashboard-content'),
    document.querySelector('.dashboard-layout'),
    document.querySelector('.post-feed'),
    document.querySelector('.posts-list')
  ];
  
  containers.forEach(container => {
    if (container) {
      const style = window.getComputedStyle(container);
      console.log(`  ${container.className || container.tagName}:`, {
        touchAction: style.touchAction,
        pointerEvents: style.pointerEvents,
        position: style.position,
        zIndex: style.zIndex
      });
    }
  });
  
  // Test touch event propagation
  console.log('\n📋 TESTING TOUCH EVENT PROPAGATION:');
  let touchEventsReceived = {
    body: 0,
    app: 0,
    content: 0,
    feed: 0
  };
  
  const testHandler = (source) => (e) => {
    touchEventsReceived[source]++;
    console.log(`  ✅ Touch event on ${source}:`, {
      type: e.type,
      touches: e.touches.length,
      defaultPrevented: e.defaultPrevented
    });
  };
  
  // Add test listeners
  document.body.addEventListener('touchstart', testHandler('body'), { once: true, passive: true });
  const app = document.querySelector('.App');
  if (app) {
    app.addEventListener('touchstart', testHandler('app'), { once: true, passive: true });
  }
  const content = document.querySelector('.dashboard-content');
  if (content) {
    content.addEventListener('touchstart', testHandler('content'), { once: true, passive: true });
  }
  const feed = document.querySelector('.post-feed');
  if (feed) {
    feed.addEventListener('touchstart', testHandler('feed'), { once: true, passive: true });
  }
  
  console.log('  🔄 Touch the content area now (not bottom nav)...');
  console.log('  (Watch for touch events in the console)');
  
  setTimeout(() => {
    console.log('\n📊 TOUCH EVENT SUMMARY:');
    console.log('  Body:', touchEventsReceived.body);
    console.log('  .App:', touchEventsReceived.app);
    console.log('  .dashboard-content:', touchEventsReceived.content);
    console.log('  .post-feed:', touchEventsReceived.feed);
    
    if (touchEventsReceived.feed === 0 && touchEventsReceived.content === 0) {
      console.log('\n⚠️ NO TOUCH EVENTS on content area - something is blocking touches!');
    }
  }, 3000);
  
  console.log('\n✅ Diagnostic complete!');
})();