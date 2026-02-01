
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://udmmawerngcgaqexndek.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mQ-8-pm7g2P7McLodeJbOw_ZnfpWupW';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
