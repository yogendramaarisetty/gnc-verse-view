import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface HistorySong {
  id: string
  title: string
  titleTransliteration?: string
  language: string
  thumbnail: string
  viewedAt: string
  artist: {
    id: string
    name: string
    photoUrl: string
  }
}

export async function getHistory(limit: number = 20): Promise<HistorySong[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return []
    }

    const { data: history, error } = await supabase
      .from('user_history')
      .select(`
        song_id,
        viewed_at,
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
      .order('viewed_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching history:', error)
      throw new Error('Failed to fetch history')
    }

    // Transform data to match frontend interface
    return history?.map(item => ({
      id: item.songs.id,
      title: item.songs.title,
      titleTransliteration: item.songs.title_transliteration,
      language: item.songs.language,
      thumbnail: item.songs.thumbnail_url,
      viewedAt: item.viewed_at,
      artist: {
        id: item.songs.artists.id,
        name: item.songs.artists.name,
        photoUrl: item.songs.artists.photo_url,
      }
    })) || []
  } catch (error) {
    console.error('Error in getHistory:', error)
    throw error
  }
}

export async function addToHistory(songId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      // For guest users, we can store in localStorage as fallback
      const guestHistory = JSON.parse(localStorage.getItem('guest_history') || '[]')
      const updatedHistory = guestHistory.filter((id: string) => id !== songId)
      updatedHistory.unshift(songId)
      updatedHistory.splice(20) // Keep only last 20
      localStorage.setItem('guest_history', JSON.stringify(updatedHistory))
      return
    }

    // Use upsert to either insert or update the viewed_at timestamp
    const { error } = await supabase
      .from('user_history')
      .upsert({
        user_id: user.id,
        song_id: songId,
        viewed_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Error adding to history:', error)
      throw new Error('Failed to add to history')
    }
  } catch (error) {
    console.error('Error in addToHistory:', error)
    throw error
  }
}

export async function clearHistory(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      // For guest users, clear localStorage
      localStorage.removeItem('guest_history')
      return
    }

    const { error } = await supabase
      .from('user_history')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      console.error('Error clearing history:', error)
      throw new Error('Failed to clear history')
    }
  } catch (error) {
    console.error('Error in clearHistory:', error)
    throw error
  }
}

export async function getGuestHistory(): Promise<string[]> {
  try {
    const guestHistory = JSON.parse(localStorage.getItem('guest_history') || '[]')
    return guestHistory
  } catch (error) {
    console.error('Error getting guest history:', error)
    return []
  }
}
