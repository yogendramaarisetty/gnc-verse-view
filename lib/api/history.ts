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
    // Validate songId
    if (!songId || typeof songId !== 'string') {
      console.error('Invalid songId provided to addToHistory:', songId)
      throw new Error('Invalid song ID provided')
    }

    console.log('Adding to history - songId:', songId)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      // For guest users, we can store in localStorage as fallback
      try {
        const guestHistory = JSON.parse(localStorage.getItem('guest_history') || '[]')
        const updatedHistory = guestHistory.filter((id: string) => id !== songId)
        updatedHistory.unshift(songId)
        updatedHistory.splice(20) // Keep only last 20
        localStorage.setItem('guest_history', JSON.stringify(updatedHistory))
        return
      } catch (localStorageError) {
        console.error('Error with localStorage in addToHistory:', localStorageError)
        // Don't throw error for localStorage issues in guest mode
        return
      }
    }

    // Use a more reliable approach: try to insert first, handle conflicts
    const { error: insertError } = await supabase
      .from('user_history')
      .insert({
        user_id: user.id,
        song_id: songId,
        viewed_at: new Date().toISOString(),
      })

    if (insertError) {
      console.log('Insert error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      })
      
      // If it's a duplicate key error, try to update instead
      if (insertError.code === '23505') {
        console.log('Duplicate key error, attempting update...')
        const { error: updateError } = await supabase
          .from('user_history')
          .update({ viewed_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('song_id', songId)

        if (updateError) {
          console.error('Error updating history after insert conflict:', updateError)
          throw new Error(`Failed to add to history: ${updateError.message || 'Unknown error'}`)
        } else {
          console.log('Successfully updated existing history record')
        }
      } else {
        console.error('Error inserting to history:', insertError)
        throw new Error(`Failed to add to history: ${insertError.message || 'Unknown error'}`)
      }
    } else {
      console.log('Successfully inserted new history record')
    }
  } catch (error) {
    console.error('Error in addToHistory:', error)
    
    // If database operation fails, try to store in localStorage as fallback
    try {
      console.log('Database operation failed, falling back to localStorage')
      const fallbackHistory = JSON.parse(localStorage.getItem('fallback_history') || '[]')
      const updatedHistory = fallbackHistory.filter((id: string) => id !== songId)
      updatedHistory.unshift(songId)
      updatedHistory.splice(20) // Keep only last 20
      localStorage.setItem('fallback_history', JSON.stringify(updatedHistory))
      console.log('Successfully stored in localStorage fallback')
      return // Don't throw error, just return successfully
    } catch (localStorageError) {
      console.error('Even localStorage fallback failed:', localStorageError)
    }
    
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
