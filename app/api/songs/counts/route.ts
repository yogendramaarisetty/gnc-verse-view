import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get counts for each language individually for better performance
    const languages = ['Telugu', 'Malayalam', 'English', 'Hindi', 'Tamil']
    const counts: Record<string, number> = {}
    
    // Get count for each language (unique songs only)
    for (const language of languages) {
      const { data, error } = await supabase
        .from('songs')
        .select('title')
        .eq('language', language)
      
      if (error) {
        console.error(`Error fetching count for ${language}:`, error)
        counts[language] = 0
      } else {
        // Count unique titles (equivalent to SELECT COUNT(DISTINCT title))
        const uniqueTitles = new Set(data?.map(song => song.title) || [])
        counts[language] = uniqueTitles.size
      }
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
      languageCounts: counts,
      totalCount: totalCount || 0
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Error in song counts API:', error)
    return NextResponse.json({ error: 'Failed to fetch song counts' }, { status: 500 })
  }
}
