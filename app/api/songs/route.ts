import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const language = searchParams.get('language')

    console.log('🎵 API Request:', { limit, offset, language })

    // Get total count first
    let countQuery = supabase.from('songs').select('*', { count: 'exact', head: true })
    if (language && language !== 'all') {
      countQuery = countQuery.eq('language', language)
    }
    const { count: totalCount } = await countQuery

    // Get songs with artists for pagination
    let query = supabase
      .from('songs')
      .select(`
        *,
        artists (
          id,
          name,
          photo_url,
          total_songs,
          total_views
        )
      `)
      .range(offset, offset + limit - 1)
      .order('trending', { ascending: false })
      .order('view_count', { ascending: false })
      .order('title', { ascending: true })

    // Apply language filter if provided
    if (language && language !== 'all') {
      query = query.eq('language', language)
    }

    const { data: songs, error } = await query

    if (error) {
      console.error('Error fetching songs:', error)
      return NextResponse.json({ error: 'Failed to fetch songs' }, { status: 500 })
    }

    console.log('📊 API Response:', { 
      songsCount: songs?.length || 0, 
      totalCount, 
      offset, 
      limit,
      hasMore: (songs?.length || 0) === limit
    })

    // Transform data to match Song interface
    const transformedSongs = (songs || []).map(song => ({
      id: song.id,
      title: song.title,
      titleTransliteration: song.title_transliteration,
      artist: {
        id: song.artists?.id || '',
        name: song.artists?.name || 'Unknown Artist',
        photoUrl: song.artists?.photo_url || null,
        totalSongs: song.artists?.total_songs || 0,
        totalViews: song.artists?.total_views || 0,
      },
      language: song.language,
      tags: song.tags || [],
      lyrics: song.lyrics || [],
      chords: song.chords || [],
      originalKey: song.original_key,
      thumbnail: song.thumbnail_url,
      hasVideo: song.has_video,
      videoUrl: song.video_url,
      youtubeViews: song.youtube_views,
      youtubeLikes: song.youtube_likes,
      releaseDate: song.release_date,
      viewCount: song.view_count,
      trending: song.trending,
    }))

    return NextResponse.json({ 
      songs: transformedSongs,
      totalCount: totalCount || 0,
      hasMore: (songs?.length || 0) === limit
    })
  } catch (error) {
    console.error('Error in songs API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}