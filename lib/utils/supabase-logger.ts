interface SupabaseLogEntry {
  timestamp: string
  method: string
  table: string
  operation: string
  url: string
  resultCount: number
  duration: number
  status: 'success' | 'error'
  error?: string
}

class SupabaseLogger {
  private logs: SupabaseLogEntry[] = []
  private maxLogs = 100 // Keep only last 100 entries

  log(entry: Omit<SupabaseLogEntry, 'timestamp'>) {
    const logEntry: SupabaseLogEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    }
    
    this.logs.unshift(logEntry)
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }
    
    // Console log for development
    if (process.env.NODE_ENV === 'development') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'
      console.log(`[Supabase] URL: ${supabaseUrl}`)
      console.log(`[Supabase] ${entry.method} ${entry.table}.${entry.operation} - ${entry.resultCount} results (${entry.duration}ms)`)
      if (entry.error) {
        console.log(`[Supabase] Error: ${entry.error}`)
      }
    }
  }

  getLogs(limit: number = 50): SupabaseLogEntry[] {
    return this.logs.slice(0, limit)
  }

  getStats() {
    const total = this.logs.length
    const success = this.logs.filter(log => log.status === 'success').length
    const errors = this.logs.filter(log => log.status === 'error').length
    const avgDuration = this.logs.reduce((sum, log) => sum + log.duration, 0) / total || 0
    
    return {
      total,
      success,
      errors,
      avgDuration: Math.round(avgDuration),
      recentLogs: this.logs.slice(0, 10)
    }
  }

  clear() {
    this.logs = []
  }
}

export const supabaseLogger = new SupabaseLogger()
