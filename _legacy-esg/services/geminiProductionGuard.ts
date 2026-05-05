/**
 * En producción, evitar usar clave Gemini inyectada en el bundle: usar proxy Edge.
 */
import { isGeminiProxyEnabled } from './geminiInvocation';

export function warnIfProductionGeminiKeyExposed(): void {
  if (!import.meta.env.PROD) return;
  if (isGeminiProxyEnabled()) return;
  const viteKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (typeof viteKey === 'string' && viteKey.length > 10) {
    console.warn(
      '[NFQ ESG] Producción: VITE_GEMINI_API_KEY está en el bundle. Despliega gemini-proxy y usa VITE_GEMINI_USE_PROXY=true; sin clave en el cliente.'
    );
  }
}
