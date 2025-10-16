import { createBrowserClient } from '@supabase/ssr'

/**
 * Build-safe Supabase client that handles missing environment variables gracefully
 * This is used during build time when environment variables might not be available
 */
export function createBuildSafeClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Check if Supabase environment variables are properly configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'placeholder-key'
  )
}
