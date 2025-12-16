import { createClient, SupabaseClient } from '@supabase/supabase-js';
import config from '../config';

let supabaseClient: SupabaseClient;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(
      config.SUPABASE_URL,
      config.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return supabaseClient;
}

export default getSupabaseClient;

