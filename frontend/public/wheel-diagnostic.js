// 🔧 Wheel Event Diagnostic - Run in browser console to diagnose mouse wheel issues

(function() {
  console.log('🔍 Mouse Wheel Diagnostic Starting...\n');
  
  // Check if wheel event listeners exist
  console.log('📋 WHEEL EVENT LISTENERS:');
  const wheelListeners = [];
  
  // Check document and window for wheel listeners (we can't directly detect, but we can test)
  console.log('  Testing wheel event dispatch...');
  
  let wheelEventReceived = false;
  const testHandler = (e) => {
    wheelEventReceived = true;
    console.log('  ✅ Wheel event detected!', {
      defaultPrevented: e.defaultPrevented,
      target: e.target,
      currentTarget: e.currentTarget
    });
  };
  
  document.addEventListener('wheel', testHandler, { once: true, passive: false });
  window.addEventListener('wheel', testHandler, { once: true, passive: false });
  
  // Simulate wheel event
  const testEvent = new WheelEvent('wheel', { 
    bubbles: true, 
    cancelable: true,
    deltaY: 10 
  });
  
  setTimeout(() => {
    document.dispatchEvent(testEvent);
    window.dispatchEvent(testEvent);
    
    setTimeout(() => {
      if (!wheelEventReceived) {
        console.log('  ⚠️ Wheel event might be blocked or not reaching handlers');
      }
    }, 100);
  }, 100);
  
  // Check for fixed/absolute positioned elements that might cover the page
  console.log('\n📋 OVERLAY ELEMENTS:');
  const allElements = document.querySelectorAll('*');
  const suspiciousElements = [];
  
  allElements.forEach(el => {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    
    // Check for fixed/absolute positioned elements covering most of viewport
    if (
      (style.position === 'fixed' || style.position === 'absolute') &&
      rect.width > window.innerWidth * 0.9 &&
      rect.height > window.innerHeight * 0.9 &&
      parseFloat(style.opacity) > 0 &&
      style.pointerEvents !== 'none'
    ) {
      const zIndex = parseInt(style.zIndex) || 0;
      suspiciousElements.push({
        element: el,
        tag: el.tagName,
        className: el.className,
        zIndex: zIndex,
        position: style.position,
        opacity: style.opacity,
        pointerEvents: style.pointerEvents
      });
    }
  });
  
  if (suspiciousElements.length > 0) {
    console.log(`  ⚠️ Found ${suspiciousElements.length} suspicious overlay elements:`);
    suspiciousElements.sort((a, b) => b.zIndex - a.zIndex).forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.tag}.${item.className}`, {
        zIndex: item.zIndex,
        position: item.position,
        opacity: item.opacity,
        pointerEvents: item.pointerEvents,
        element: item.element
      });
    });
  } else {
    console.log('  ✅ No suspicious overlay elements found');
  }
  
  // Check CSS that might block wheel
  console.log('\n📋 CSS CHECKS:');
  const bodyStyle = window.getComputedStyle(document.body);
  const htmlStyle = window.getComputedStyle(document.documentElement);
  const appStyle = document.querySelector('.App') ? window.getComputedStyle(document.querySelector('.App')) : null;
  
  console.log('  Body pointer-events:', bodyStyle.pointerEvents);
  console.log('  Body touch-action:', bodyStyle.touchAction);
  console.log('  HTML pointer-events:', htmlStyle.pointerEvents);
  console.log('  HTML touch-action:', htmlStyle.touchAction);
  if (appStyle) {
    console.log('  .App pointer-events:', appStyle.pointerEvents);
    console.log('  .App touch-action:', appStyle.touchAction);
  }
  
  // Try to manually enable wheel scrolling
  console.log('\n🔧 ATTEMPTING FIX:');
  console.log('  Checking if any element has pointer-events: none on body/html...');
  
  if (bodyStyle.pointerEvents === 'none') {
    console.log('  ⚠️ Body has pointer-events: none - this would block wheel events!');
    document.body.style.pointerEvents = '';
    console.log('  ✅ Reset body pointer-events');
  } else {
    console.log('  ℹ️ Body pointer-events is fine');
  }
  
  if (htmlStyle.pointerEvents === 'none') {
    console.log('  ⚠️ HTML has pointer-events: none - this would block wheel events!');
    document.documentElement.style.pointerEvents = '';
    console.log('  ✅ Reset HTML pointer-events');
  } else {
    console.log('  ℹ️ HTML pointer-events is fine');
  }
  
  console.log('\n✅ Diagnostic complete! Try scrolling with mouse wheel now.');
})();
