import { NextRequest, NextResponse } from 'next/server'
import { DataReconciliationService } from '@/lib/services/data-reconciliation'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and has admin privileges
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { songs, chunkIndex, totalChunks, sessionId } = body

    if (!songs || !Array.isArray(songs)) {
      return NextResponse.json({ 
        error: 'Invalid data format. Expected array of songs.' 
      }, { status: 400 })
    }

    if (chunkIndex === undefined || totalChunks === undefined || !sessionId) {
      return NextResponse.json({ 
        error: 'Missing required parameters: chunkIndex, totalChunks, sessionId' 
      }, { status: 400 })
    }

    console.log(`🔄 Processing chunk ${chunkIndex + 1}/${totalChunks} for session ${sessionId} (${songs.length} songs)...`)

    // Initialize reconciliation service
    const reconciliationService = new DataReconciliationService()
    
    // Process the chunk
    const result = await reconciliationService.reconcileData(songs)

    // Log the results
    console.log(`📊 Chunk ${chunkIndex + 1} completed:`, {
      created: result.created,
      updated: result.updated,
      deleted: result.deleted,
      errors: result.errors.length
    })

    return NextResponse.json({
      success: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} processed successfully`,
      result: {
        chunkIndex,
        totalChunks,
        sessionId,
        created: result.created,
        updated: result.updated,
        deleted: result.deleted,
        errors: result.errors,
        summary: result.summary
      }
    })

  } catch (error) {
    console.error('💥 Error processing chunk:', error)
    
    return NextResponse.json({ 
      error: 'Failed to process chunk',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Check if user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current database stats
    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .select('id, title, language, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(100)

    const { data: artists, error: artistsError } = await supabase
      .from('artists')
      .select('id, name, total_songs')
      .order('total_songs', { ascending: false })
      .limit(50)

    if (songsError || artistsError) {
      throw new Error('Failed to fetch database stats')
    }

    // Get language distribution
    const languageStats = songs?.reduce((acc: any, song: any) => {
      acc[song.language] = (acc[song.language] || 0) + 1
      return acc
    }, {}) || {}

    return NextResponse.json({
      success: true,
      stats: {
        totalSongs: songs?.length || 0,
        totalArtists: artists?.length || 0,
        recentSongs: songs?.slice(0, 10) || [],
        topArtists: artists?.slice(0, 10) || [],
        languageDistribution: languageStats
      }
    })

  } catch (error) {
    console.error('💥 Error fetching stats:', error)
    
    return NextResponse.json({ 
      error: 'Failed to fetch database stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
