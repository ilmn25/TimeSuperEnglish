
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://cxjkcrpapxlrceelzshu.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_27zWxhCOkv7vnnXEOA8qmQ_e2tp76FD';
export const SUPABASE_ORG_ID = '9df6da6d-e0b3-469c-bd60-c3a66cfc96b2';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
