export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

export type SupabaseAdminEnv = SupabasePublicEnv & {
  serviceRoleKey: string;
};

const missingPublicEnvMessage =
  "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";

const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabasePublicEnv(env?: NodeJS.ProcessEnv): SupabasePublicEnv {
  const url = env?.NEXT_PUBLIC_SUPABASE_URL ?? publicSupabaseUrl;
  const anonKey = env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? publicSupabaseAnonKey;

  if (!url || !anonKey) {
    throw new Error(missingPublicEnvMessage);
  }

  return { url, anonKey };
}

export function getSupabaseAdminEnv(env: NodeJS.ProcessEnv = process.env): SupabaseAdminEnv {
  const publicEnv = getSupabasePublicEnv(env);
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("Supabase admin access is not configured. Add SUPABASE_SERVICE_ROLE_KEY on the server only.");
  }

  return { ...publicEnv, serviceRoleKey };
}
