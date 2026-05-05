/*
 * @geshop/db — Cliente Supabase + tipos del schema
 *
 * Estado F0:
 *   - Stub. Los clientes y tipos llegan en F1 cuando se trasplante el código de
 *     nfq-carbon-intelligence/src/lib/supabase/{client,server,update-session}.ts
 *
 * Cuando Supabase esté creado:
 *   pnpm dlx supabase gen types typescript --project-id <ID> > src/types.ts
 */
export type Database = Record<string, never>;
