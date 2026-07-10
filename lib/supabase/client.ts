"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser client: anonymous-auth session, RLS-scoped reads + realtime only.
// All writes go through /api routes.
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
