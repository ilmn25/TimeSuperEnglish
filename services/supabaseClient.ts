
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://udmmawerngcgaqexndek.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_mQ-8-pm7g2P7McLodeJbOw_ZnfpWupW';
export const SUPABASE_ORG_ID = '8a7105a0-a2e4-4cf5-bf17-c4ebc5a07bda';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
