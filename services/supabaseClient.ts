
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://cxjkcrpapxlrceelzshu.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_27zWxhCOkv7vnnXEOA8qmQ_e2tp76FD';
export const SUPABASE_ORG_ID = '228a7079-75c9-4417-ab52-87b9a6d06f34';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
