import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { id } = params

    const { data: song, error } = await supabase
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
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching song:', error)
      return NextResponse.json({ error: 'Song not found' }, { status: 404 })
    }

    // Transform data to match frontend interface
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

    return NextResponse.json({ song: transformedSong })
  } catch (error) {
    console.error('Error in song GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()

    const { data: song, error } = await supabase
      .from('songs')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
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
      console.error('Error updating song:', error)
      return NextResponse.json({ error: 'Failed to update song' }, { status: 500 })
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

    return NextResponse.json({ song: transformedSong })
  } catch (error) {
    console.error('Error in song PATCH API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const { error } = await supabase
      .from('songs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting song:', error)
      return NextResponse.json({ error: 'Failed to delete song' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Song deleted successfully' })
  } catch (error) {
    console.error('Error in song DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
