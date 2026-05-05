/**
 * Llamadas centralizadas a Gemini: proxy Edge (sin clave en el cliente) o SDK local.
 */
import { supabase } from './supabaseClient';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';

export function isGeminiProxyEnabled(): boolean {
  return import.meta.env.VITE_GEMINI_USE_PROXY === 'true' && Boolean(supabaseUrl);
}

export async function getSessionAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function invokeGeminiProxy(payload: {
  model: string;
  contents: string;
  config?: { responseMimeType?: string };
  stream?: boolean;
}): Promise<Response> {
  const token = await getSessionAccessToken();
  if (!token) {
    throw new Error('Inicia sesión para usar el proxy Gemini.');
  }
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const url = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/gemini-proxy`;
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: anon,
    },
    body: JSON.stringify({
      model: payload.model,
      contents: payload.contents,
      config: payload.config,
      stream: payload.stream ?? false,
    }),
  });
}

export async function invokeGeminiGenerateText(params: {
  model: string;
  contents: string;
  config?: { responseMimeType?: string };
}): Promise<string> {
  const res = await invokeGeminiProxy({ ...params, stream: false });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Gemini proxy ${res.status}`);
  }
  const json = (await res.json()) as { text?: string };
  return json.text ?? '';
}
