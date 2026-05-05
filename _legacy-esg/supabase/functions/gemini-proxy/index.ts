/**
 * Proxy Gemini: la clave vive solo en secretos Supabase (GEMINI_API_KEY).
 * El cliente envía el JWT de Supabase Auth en Authorization.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = (req: Request) => {
  const allow =
    Deno.env.get("GEMINI_PROXY_ALLOWED_ORIGIN") ||
    req.headers.get("Origin") ||
    "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
};

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const p = payload as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const parts = p.candidates?.[0]?.content?.parts;
  if (!parts?.length) return "";
  return parts.map((x) => x.text ?? "").join("");
}

Deno.serve(async (req) => {
  const headers = cors(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Server missing GEMINI_API_KEY secret" }),
      {
        status: 503,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  }

  let body: {
    model?: string;
    contents?: unknown;
    config?: { responseMimeType?: string };
    stream?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const model = body.model ?? "gemini-2.0-flash";
  const stream = Boolean(body.stream);

  const promptText =
    typeof body.contents === "string"
      ? body.contents
      : JSON.stringify(body.contents ?? "");

  const restBody: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: promptText }] }],
  };

  if (body.config?.responseMimeType) {
    restBody.generationConfig = {
      responseMimeType: body.config.responseMimeType,
    };
  }

  const base = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}`;

  if (stream) {
    const url = `${base}:streamGenerateContent?key=${encodeURIComponent(apiKey)}`;
    const gRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restBody),
    });

    if (!gRes.ok) {
      const errText = await gRes.text();
      return new Response(
        JSON.stringify({ error: "Gemini error", detail: errText }),
        {
          status: 502,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(gRes.body, {
      headers: {
        ...headers,
        "Content-Type":
          gRes.headers.get("Content-Type") ?? "text/event-stream",
      },
    });
  }

  const url = `${base}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const gRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(restBody),
  });

  const raw = await gRes.json();
  if (!gRes.ok) {
    return new Response(JSON.stringify({ error: "Gemini error", detail: raw }), {
      status: 502,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const text = extractText(raw);
  return new Response(JSON.stringify({ text, raw }), {
    headers: { ...headers, "Content-Type": "application/json" },
  });
});
