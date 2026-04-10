/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_ORGANIZATION_ID?: string;
  readonly VITE_REPORTING_CYCLE_ID?: string;
  readonly VITE_USE_REPORTING_PACK_RPC?: string;
  readonly VITE_ENABLE_ORG_FILTER?: string;
  readonly VITE_API_FETCH_TIMEOUT_MS?: string;
  readonly VITE_ALLOW_DEMO_LOGIN?: string;
  readonly VITE_GEMINI_USE_PROXY?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_SENTRY_DSN?: string;
  /** Override release name in Sentry (ej. commit SHA en CI) */
  readonly VITE_SENTRY_RELEASE?: string;
  /** Inyectado desde package.json en vite.config */
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
