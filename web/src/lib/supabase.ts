import { createClient } from "@supabase/supabase-js";
import { env, hasSupabaseBrowserConfig } from "./env";

export const supabase = hasSupabaseBrowserConfig
  ? createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
