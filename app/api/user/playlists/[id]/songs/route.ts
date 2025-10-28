import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
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
    const { songId } = await request.json()

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 })
    }

    // Check if playlist belongs to user
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (playlistError || !playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    // Get the next position for the song
    const { data: lastSong, error: lastSongError } = await supabase
      .from('playlist_songs')
      .select('position')
      .eq('playlist_id', id)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const nextPosition = lastSong ? lastSong.position + 1 : 1

    const { data: playlistSong, error } = await supabase
      .from('playlist_songs')
      .insert({
        playlist_id: id,
        song_id: songId,
        position: nextPosition,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding song to playlist:', error)
      return NextResponse.json({ error: 'Failed to add song to playlist' }, { status: 500 })
    }

    return NextResponse.json({ playlistSong }, { status: 201 })
  } catch (error) {
    console.error('Error in playlist songs POST API:', error)
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
    const { searchParams } = new URL(request.url)
    const songId = searchParams.get('songId')

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 })
    }

    // Check if playlist belongs to user
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (playlistError || !playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('playlist_songs')
      .delete()
      .eq('playlist_id', id)
      .eq('song_id', songId)

    if (error) {
      console.error('Error removing song from playlist:', error)
      return NextResponse.json({ error: 'Failed to remove song from playlist' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Song removed from playlist successfully' })
  } catch (error) {
    console.error('Error in playlist songs DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
