import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const { data: songs, error } = await supabase
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
      .eq('trending', true)
      .order('view_count', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching trending songs:', error)
      return NextResponse.json({ error: 'Failed to fetch trending songs' }, { status: 500 })
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
    console.error('Error in trending songs API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
