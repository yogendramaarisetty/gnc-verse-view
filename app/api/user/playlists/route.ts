import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: playlists, error } = await supabase
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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching playlists:', error)
      return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 })
    }

    // Transform data to match frontend interface
    const transformedPlaylists = playlists?.map(playlist => ({
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
    })) || []

    return NextResponse.json({ playlists: transformedPlaylists })
  } catch (error) {
    console.error('Error in playlists GET API:', error)
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

    const { name, description } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Playlist name is required' }, { status: 400 })
    }

    const { data: playlist, error } = await supabase
      .from('playlists')
      .insert({
        user_id: user.id,
        name,
        description: description || '',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating playlist:', error)
      return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 })
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

    return NextResponse.json({ playlist: transformedPlaylist }, { status: 201 })
  } catch (error) {
    console.error('Error in playlists POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
