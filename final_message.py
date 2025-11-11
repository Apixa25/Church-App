import math
import sys
sys.stdout.reconfigure(encoding='utf-8')
message_template = """## Share Flow Stabilized 🎯
- 🔧 Routed ShareModal through a dedicated portal and body-scroll lock so the overlay escapes post-card overflow, preventing the clipped view that conflicted with project-vision.md §6 (Announcements sharing experience) and §11 (Settings/Help polish).
- 🎯 Ignored the first backdrop click after opening, eliminating the flicker when the new overlay briefly registered the initial button press—keeps the joyful Enneagram 7 share moment intact per project-vision.md.
- 💡 Preserved existing share logic while guaranteeing onClose still fires for deliberate backdrop presses, maintaining the additive/no-regression mantra in project-vision.md §1.

## Simplified Snippet
`25:86:frontend/src/components/ShareModal.tsx
  const ignoreBackdropClick = useRef(false);
  const cleanupBackdropGuard = useRef<number | null>(null);
  const modalRootRef = useRef<HTMLDivElement | null>(null);
  const previousBodyOverflow = useRef<string | null>(null);
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const node = document.createElement('div');
    node.setAttribute('data-share-modal-root', 'true');
    modalRootRef.current = node;
    document.body.appendChild(node);
    return () => {
      if (modalRootRef.current) {
        document.body.removeChild(modalRootRef.current);
        modalRootRef.current = null;
      }
    };
  }, []);
  // ... existing code ...
  if (!isOpen || !modalRootRef.current) return null;
  return createPortal(
    <div
      className="share-modal-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
    // ... existing code ...
`

## Tests 🧪
- 
pm run build

## Character/Token Counts ℹ️
- Characters: <<CHAR_COUNT>>
- Approx. tokens: <<TOKEN_COUNT>>
"""
while True:
    char_count = len(message_template)
    token_count = math.ceil(char_count / 4)
    new_message = message_template.replace('<<CHAR_COUNT>>', str(char_count)).replace('<<TOKEN_COUNT>>', str(token_count))
    if new_message == message_template:
        break
    message_template = new_message
print(message_template)
print(f"CHAR_COUNT={len(message_template)}")
print(f"TOKEN_EST={math.ceil(len(message_template) / 4)}")
