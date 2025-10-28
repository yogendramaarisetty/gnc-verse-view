import { NextRequest, NextResponse } from 'next/server'
import { supabaseLogger } from '@/lib/utils/supabase-logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const clear = searchParams.get('clear') === 'true'
    
    if (clear) {
      supabaseLogger.clear()
      return NextResponse.json({ message: 'Logs cleared successfully' })
    }
    
    const logs = supabaseLogger.getLogs(limit)
    const stats = supabaseLogger.getStats()
    
    return NextResponse.json({
      logs,
      stats,
      total: logs.length,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not configured'
    })
  } catch (error) {
    console.error('Error fetching Supabase logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
