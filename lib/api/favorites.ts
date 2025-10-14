import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface FavoriteSong {
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

export async function getFavorites(): Promise<FavoriteSong[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return []
    }

    const { data: favorites, error } = await supabase
      .from('user_favorites')
      .select(`
        song_id,
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
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching favorites:', error)
      throw new Error('Failed to fetch favorites')
    }

    // Transform data to match frontend interface
    return favorites?.map(fav => ({
      id: fav.songs.id,
      title: fav.songs.title,
      titleTransliteration: fav.songs.title_transliteration,
      language: fav.songs.language,
      thumbnail: fav.songs.thumbnail_url,
      artist: {
        id: fav.songs.artists.id,
        name: fav.songs.artists.name,
        photoUrl: fav.songs.artists.photo_url,
      }
    })) || []
  } catch (error) {
    console.error('Error in getFavorites:', error)
    throw error
  }
}

export async function addFavorite(songId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { error } = await supabase
      .from('user_favorites')
      .insert({
        user_id: user.id,
        song_id: songId,
      })

    if (error) {
      console.error('Error adding favorite:', error)
      throw new Error('Failed to add favorite')
    }
  } catch (error) {
    console.error('Error in addFavorite:', error)
    throw error
  }
}

export async function removeFavorite(songId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('song_id', songId)

    if (error) {
      console.error('Error removing favorite:', error)
      throw new Error('Failed to remove favorite')
    }
  } catch (error) {
    console.error('Error in removeFavorite:', error)
    throw error
  }
}

export async function isFavorite(songId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return false
    }

    const { data, error } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('song_id', songId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error checking favorite status:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Error in isFavorite:', error)
    return false
  }
}

export async function toggleFavorite(songId: string): Promise<boolean> {
  try {
    const isFav = await isFavorite(songId)
    
    if (isFav) {
      await removeFavorite(songId)
      return false
    } else {
      await addFavorite(songId)
      return true
    }
  } catch (error) {
    console.error('Error in toggleFavorite:', error)
    throw error
  }
}
