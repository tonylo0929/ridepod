import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

// Do not import this helper into client components. It uses the service-role key
// and must stay isolated to trusted server/admin code.
let adminClient: SupabaseClient<Database> | null = null;

export function getSupabaseAdminClient() {
  if (!adminClient) {
    const { url, serviceRoleKey } = getSupabaseAdminEnv();
    adminClient = createClient<Database>(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}
