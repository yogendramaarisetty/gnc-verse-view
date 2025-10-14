import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    
    const query = searchParams.get('q')
    const language = searchParams.get('language')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
    }

    let supabaseQuery = supabase
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

    // Apply language filter if provided
    if (language) {
      supabaseQuery = supabaseQuery.eq('language', language)
    }

    // Apply full-text search
    supabaseQuery = supabaseQuery.textSearch('title', query, {
      type: 'websearch',
      config: 'english'
    })

    // Apply pagination
    supabaseQuery = supabaseQuery.range(offset, offset + limit - 1)

    const { data: songs, error } = await supabaseQuery

    if (error) {
      console.error('Error searching songs:', error)
      return NextResponse.json({ error: 'Failed to search songs' }, { status: 500 })
    }

    // Transform data to match frontend interface
    const transformedSongs = songs?.map(song => ({
      id: song.id,
      title: song.title,
      titleTransliteration: song.title_transliteration,
      artist: {
        id: song.artists.id,
        name: song.artists.name,
        photoUrl: song.artists.photo_url,
        totalSongs: song.artists.total_songs,
        totalViews: song.artists.total_views,
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
    })) || []

    return NextResponse.json({ songs: transformedSongs })
  } catch (error) {
    console.error('Error in search API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
