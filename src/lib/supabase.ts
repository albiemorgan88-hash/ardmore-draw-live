import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
export const browserAuthConfigured = Boolean(supabaseUrl && supabaseAnonKey)

let browserClient: ReturnType<typeof createClient> | undefined
// Preview builds do not need access to the live database. Missing configuration
// never becomes a fallback database connection or credential.
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, property) {
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Accounts are not configured in this environment')
    browserClient ??= createClient(supabaseUrl, supabaseAnonKey)
    const value = Reflect.get(browserClient, property)
    return typeof value === 'function' ? value.bind(browserClient) : value
  },
})

// Server client with service role (for API routes / webhooks only)
export function createServiceClient() {
  if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Database is not configured in this environment')
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
