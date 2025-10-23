import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseLogger } from '@/lib/utils/supabase-logger'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const language = searchParams.get('language')
    const trending = searchParams.get('trending')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

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
      .order('created_at', { ascending: false })

    // Apply filters
    if (language && language !== 'all') {
      query = query.eq('language', language)
    }

    if (trending === 'true') {
      query = query.eq('trending', true)
    }

    if (search) {
      query = query.textSearch('title', search, {
        type: 'websearch',
        config: 'english'
      })
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const startTime = Date.now()
    const { data: songs, error } = await query
    const duration = Date.now() - startTime

    // Log the query
    supabaseLogger.log({
      method: 'GET',
      table: 'songs',
      operation: 'select',
      url: `songs.select(language:${language || 'all'}, limit:${limit})`,
      resultCount: songs?.length || 0,
      duration,
      status: error ? 'error' : 'success',
      error: error?.message
    })

    if (error) {
      console.error('Error fetching songs:', error)
      return NextResponse.json({ error: 'Failed to fetch songs' }, { status: 500 })
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
      englishLyrics: song.english_lyrics || [],
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
    console.error('Error in songs API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      titleTransliteration,
      artistId,
      language,
      tags,
      lyrics,
      chords,
      originalKey,
      thumbnailUrl,
      hasVideo,
      videoUrl,
      youtubeViews,
      youtubeLikes,
      releaseDate,
      trending
    } = body

    const { data: song, error } = await supabase
      .from('songs')
      .insert({
        title,
        title_transliteration: titleTransliteration,
        artist_id: artistId,
        language,
        tags: tags || [],
        lyrics: lyrics || [],
        chords: chords || [],
        original_key: originalKey,
        thumbnail_url: thumbnailUrl,
        has_video: hasVideo || false,
        video_url: videoUrl,
        youtube_views: youtubeViews || 0,
        youtube_likes: youtubeLikes || 0,
        release_date: releaseDate,
        trending: trending || false,
      })
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
      .single()

    if (error) {
      console.error('Error creating song:', error)
      return NextResponse.json({ error: 'Failed to create song' }, { status: 500 })
    }

    // Transform response
    const transformedSong = {
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
      englishLyrics: song.english_lyrics || [],
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
    }

    return NextResponse.json({ song: transformedSong }, { status: 201 })
  } catch (error) {
    console.error('Error in songs POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
