"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/supabase/build-safe-client'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Check if Supabase is configured before creating client
  const isConfigured = isSupabaseConfigured()
  const supabase = isConfigured ? createClient() : null

  useEffect(() => {
    if (!isConfigured || !supabase) {
      setLoading(false)
      return
    }

    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [isConfigured, supabase])

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
  }

  return {
    user,
    loading,
    signOut,
    isAuthenticated: !!user,
  }
}
