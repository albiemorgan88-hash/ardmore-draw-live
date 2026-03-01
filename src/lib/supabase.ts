import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://smhzgkvatlwbaxlyhnbm.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_cp581S0l9VXqEATr0U32TQ_F8gCpF5g'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
