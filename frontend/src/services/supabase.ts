import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://xczdiqizaweqszklsddm.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_Ri2xExiE4ZsziIq9zOCf-Q_8KIqz_8t';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
