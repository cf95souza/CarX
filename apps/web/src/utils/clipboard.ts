/**
 * Utilitário universal para cópia para a área de transferência.
 * Funciona de forma resiliente em:
 * - Contextos seguros (HTTPS e localhost via navigator.clipboard)
 * - Contextos não seguros (HTTP via IP, ex: VPS Oracle http://137.131.151.125:8080)
 * - Dispositivos móveis (iOS/Android), tablets e navegadores legados.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Tenta API navigator.clipboard se disponível no contexto do navegador
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (navErr) {
    console.warn('[clipboard] Falha na API navigator.clipboard, tentando fallback...', navErr);
  }

  // 2. Fallback robusto via textarea e document.execCommand('copy')
  try {
    if (typeof document !== 'undefined') {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.style.opacity = '0';
      textArea.setAttribute('readonly', '');

      document.body.appendChild(textArea);

      // Compatibilidade específica com iOS Safari
      if (navigator.userAgent && /ipad|ipod|iphone/i.test(navigator.userAgent)) {
        const range = document.createRange();
        range.selectNodeContents(textArea);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        textArea.setSelectionRange(0, 999999);
      } else {
        textArea.focus();
        textArea.select();
      }

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (execErr) {
    console.error('[clipboard] Falha crítica no fallback de cópia:', execErr);
  }

  return false;
}
