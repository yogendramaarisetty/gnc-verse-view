import { createClient } from '@/lib/supabase/client'
import type { Playlist } from '@/lib/types'

const supabase = createClient()

export interface PlaylistSong {
  id: string
  title: string
  titleTransliteration?: string
  language: string
  thumbnail: string
  artist: {
    id: string
    name: string
    photoUrl: string
  }
}

export interface PlaylistWithSongs extends Playlist {
  songs: PlaylistSong[]
}

export async function getPlaylists(): Promise<PlaylistWithSongs[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return []
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
      throw new Error('Failed to fetch playlists')
    }

    // Transform data to match frontend interface
    return playlists?.map(playlist => ({
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
  } catch (error) {
    console.error('Error in getPlaylists:', error)
    throw error
  }
}

export async function createPlaylist(name: string, description: string = ''): Promise<PlaylistWithSongs> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: playlist, error } = await supabase
      .from('playlists')
      .insert({
        user_id: user.id,
        name,
        description,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating playlist:', error)
      throw new Error('Failed to create playlist')
    }

    // Transform response
    return {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      shareCode: playlist.share_code,
      createdAt: playlist.created_at,
      songIds: [],
      songs: []
    }
  } catch (error) {
    console.error('Error in createPlaylist:', error)
    throw error
  }
}

export async function updatePlaylist(playlistId: string, updates: { name?: string; description?: string }): Promise<PlaylistWithSongs> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: playlist, error } = await supabase
      .from('playlists')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', playlistId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating playlist:', error)
      throw new Error('Failed to update playlist')
    }

    // Transform response
    return {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      shareCode: playlist.share_code,
      createdAt: playlist.created_at,
      songIds: [],
      songs: []
    }
  } catch (error) {
    console.error('Error in updatePlaylist:', error)
    throw error
  }
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', playlistId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting playlist:', error)
      throw new Error('Failed to delete playlist')
    }
  } catch (error) {
    console.error('Error in deletePlaylist:', error)
    throw error
  }
}

export async function addSongToPlaylist(playlistId: string, songId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Check if playlist belongs to user
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('id')
      .eq('id', playlistId)
      .eq('user_id', user.id)
      .single()

    if (playlistError || !playlist) {
      throw new Error('Playlist not found')
    }

    // Get the next position for the song
    const { data: lastSong, error: lastSongError } = await supabase
      .from('playlist_songs')
      .select('position')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const nextPosition = lastSong ? lastSong.position + 1 : 1

    const { error } = await supabase
      .from('playlist_songs')
      .insert({
        playlist_id: playlistId,
        song_id: songId,
        position: nextPosition,
      })

    if (error) {
      console.error('Error adding song to playlist:', error)
      throw new Error('Failed to add song to playlist')
    }
  } catch (error) {
    console.error('Error in addSongToPlaylist:', error)
    throw error
  }
}

export async function removeSongFromPlaylist(playlistId: string, songId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Check if playlist belongs to user
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('id')
      .eq('id', playlistId)
      .eq('user_id', user.id)
      .single()

    if (playlistError || !playlist) {
      throw new Error('Playlist not found')
    }

    const { error } = await supabase
      .from('playlist_songs')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('song_id', songId)

    if (error) {
      console.error('Error removing song from playlist:', error)
      throw new Error('Failed to remove song from playlist')
    }
  } catch (error) {
    console.error('Error in removeSongFromPlaylist:', error)
    throw error
  }
}
