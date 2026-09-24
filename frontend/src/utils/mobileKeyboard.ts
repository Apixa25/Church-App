const PRIME_ID = 'composer-keyboard-prime';

const isCoarsePointer = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth <= 768;
};

/**
 * Focus a temporary field during the tap that opens the composer.
 * Mobile browsers only show the keyboard for focus that happens inside
 * the user gesture. The real textarea mounts on the next render, which
 * is too late, so this field holds the keyboard open until that handoff.
 */
export const primeMobileKeyboard = (): void => {
  if (typeof document === 'undefined' || !isCoarsePointer()) return;

  let el = document.getElementById(PRIME_ID) as HTMLTextAreaElement | null;
  if (!el) {
    el = document.createElement('textarea');
    el.id = PRIME_ID;
    el.setAttribute('aria-hidden', 'true');
    el.tabIndex = -1;
    el.autocomplete = 'off';
    el.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:2px',
      'height:2px',
      'opacity:0.01',
      'font-size:16px',
      'border:0',
      'padding:0',
      'margin:0',
      'z-index:1',
      'caret-color:transparent'
    ].join(';');
    document.body.appendChild(el);
  }

  el.focus();
};

export const handoffMobileKeyboard = (target: HTMLTextAreaElement | null): void => {
  if (target && document.activeElement !== target) {
    target.focus({ preventScroll: true });
  }

  const prime = document.getElementById(PRIME_ID);
  if (prime && prime !== target) {
    window.requestAnimationFrame(() => prime.remove());
  }
};

export const dismissMobileKeyboardPrime = (): void => {
  document.getElementById(PRIME_ID)?.remove();
};
