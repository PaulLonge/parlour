import { createClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS — the referee and director run through
// this. Server-side only; importing it in client code will fail loudly.
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set (server-only)");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
