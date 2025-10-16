import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const { data: playlist, error } = await supabase
      .from('playlists')
      .select(`
        *,
        playlist_songs (
          song_id,
          position,
          songs (
            id,
            title,
            title_transliteration,
            language,
            thumbnail_url,
            artists (
              id,
              name,
              photo_url
            )
          )
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching playlist:', error)
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    // Transform data to match frontend interface
    const transformedPlaylist = {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      shareCode: playlist.share_code,
      createdAt: playlist.created_at,
      songIds: playlist.playlist_songs
        ?.sort((a, b) => a.position - b.position)
        .map(ps => ps.song_id) || [],
      songs: playlist.playlist_songs
        ?.sort((a, b) => a.position - b.position)
        .map(ps => ({
          id: ps.songs.id,
          title: ps.songs.title,
          titleTransliteration: ps.songs.title_transliteration,
          language: ps.songs.language,
          thumbnail: ps.songs.thumbnail_url,
          artist: {
            id: ps.songs.artists.id,
            name: ps.songs.artists.name,
            photoUrl: ps.songs.artists.photo_url,
          }
        })) || []
    }

    return NextResponse.json({ playlist: transformedPlaylist })
  } catch (error) {
    console.error('Error in playlist GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const { name, description } = await request.json()

    const { data: playlist, error } = await supabase
      .from('playlists')
      .update({
        name,
        description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating playlist:', error)
      return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 })
    }

    // Transform response
    const transformedPlaylist = {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      shareCode: playlist.share_code,
      createdAt: playlist.created_at,
      songIds: [],
      songs: []
    }

    return NextResponse.json({ playlist: transformedPlaylist })
  } catch (error) {
    console.error('Error in playlist PATCH API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting playlist:', error)
      return NextResponse.json({ error: 'Failed to delete playlist' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Playlist deleted successfully' })
  } catch (error) {
    console.error('Error in playlist DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
