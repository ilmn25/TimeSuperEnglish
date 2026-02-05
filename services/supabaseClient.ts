
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cxjkcrpapxlrceelzshu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_27zWxhCOkv7vnnXEOA8qmQ_e2tp76FD';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
