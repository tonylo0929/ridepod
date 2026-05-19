import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

let serverClient: SupabaseClient<Database> | null = null;

export function getSupabaseServerClient() {
  if (!serverClient) {
    const { url, anonKey } = getSupabasePublicEnv();
    serverClient = createClient<Database>(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return serverClient;
}
