import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get song counts by language
    const { data: languageCounts, error } = await supabase
      .from('songs')
      .select('language')
      .then(({ data, error }) => {
        if (error) throw error
        
        // Count songs by language
        const counts = data.reduce((acc: Record<string, number>, song) => {
          acc[song.language] = (acc[song.language] || 0) + 1
          return acc
        }, {})
        
        return { data: counts, error: null }
      })

    if (error) {
      console.error('Error fetching song counts:', error)
      return NextResponse.json({ error: 'Failed to fetch song counts' }, { status: 500 })
    }

    // Get total count
    const { count: totalCount, error: totalError } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })

    if (totalError) {
      console.error('Error fetching total count:', totalError)
      return NextResponse.json({ error: 'Failed to fetch total count' }, { status: 500 })
    }

    return NextResponse.json({
      languageCounts: languageCounts || {},
      totalCount: totalCount || 0
    })

  } catch (error) {
    console.error('Error in song counts API:', error)
    return NextResponse.json({ error: 'Failed to fetch song counts' }, { status: 500 })
  }
}
