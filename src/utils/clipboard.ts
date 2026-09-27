/**
 * Bulletproof cross-platform clipboard copy utility
 * Supports:
 * 1. Electron desktop native clipboard IPC
 * 2. Modern navigator.clipboard API (with permission checks)
 * 3. Fallback textarea + document.execCommand('copy') for iframes, inactive focus or older webviews
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return true;

  // 1. Electron native IPC
  if (typeof window !== 'undefined' && (window as any).electronAPI?.copyToClipboard) {
    try {
      await (window as any).electronAPI.copyToClipboard(text);
      return true;
    } catch (e) {
      console.warn('Electron clipboard bridge error:', e);
    }
  }

  // 2. Modern Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard.writeText failed, falling back to execCommand:', err);
    }
  }

  // 3. Fallback: temporary hidden textarea
  if (typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      textArea.style.opacity = '0';
      textArea.style.pointerEvents = 'none';
      textArea.setAttribute('readonly', '');
      
      document.body.appendChild(textArea);
      textArea.focus({ preventScroll: true });
      textArea.select();
      textArea.setSelectionRange(0, text.length);

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) return true;
    } catch (err) {
      console.error('execCommand copy fallback failed:', err);
    }
  }

  return false;
}
