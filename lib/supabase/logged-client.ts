import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseLogger } from '@/lib/utils/supabase-logger'

export async function createLoggedClient() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  // Wrap the supabase client to add logging
  return new Proxy(supabase, {
    get(target, prop) {
      const original = target[prop as keyof typeof target]
      
      if (prop === 'from') {
        return (table: string) => {
          const originalFrom = original.call(target, table)
          
          // Wrap the query builder methods
          return new Proxy(originalFrom, {
            get(queryTarget, queryProp) {
              const originalQuery = queryTarget[queryProp as keyof typeof queryTarget]
              
              if (typeof originalQuery === 'function') {
                return async (...args: any[]) => {
                  const startTime = Date.now()
                  const operation = queryProp as string
                  
                  try {
                    const result = await originalQuery.apply(queryTarget, args)
                    const duration = Date.now() - startTime
                    
                    // Extract result count
                    let resultCount = 0
                    if (result?.data) {
                      if (Array.isArray(result.data)) {
                        resultCount = result.data.length
                      } else if (result.data !== null) {
                        resultCount = 1
                      }
                    } else if (result?.count !== undefined) {
                      resultCount = result.count
                    }
                    
                    // Log the operation
                    supabaseLogger.log({
                      method: 'GET',
                      table,
                      operation,
                      url: `${table}.${operation}`,
                      resultCount,
                      duration,
                      status: 'success'
                    })
                    
                    return result
                  } catch (error) {
                    const duration = Date.now() - startTime
                    
                    supabaseLogger.log({
                      method: 'GET',
                      table,
                      operation,
                      url: `${table}.${operation}`,
                      resultCount: 0,
                      duration,
                      status: 'error',
                      error: error instanceof Error ? error.message : 'Unknown error'
                    })
                    
                    throw error
                  }
                }
              }
              
              return originalQuery
            }
          })
        }
      }
      
      return original
    }
  })
}
