import { createClient } from '@/lib/supabase/client'
import type { Song } from '@/lib/types'

const supabase = createClient()

export interface SongsFilters {
  language?: string
  trending?: boolean
  search?: string
  limit?: number
  offset?: number
}

export async function fetchSongs(filters: SongsFilters = {}): Promise<Song[]> {
  try {
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
    if (filters.language) {
      query = query.eq('language', filters.language)
    }

    if (filters.trending) {
      query = query.eq('trending', true)
    }

    if (filters.search) {
      query = query.textSearch('title', filters.search, {
        type: 'websearch',
        config: 'english'
      })
    }

    // Apply pagination
    const limit = filters.limit || 50
    const offset = filters.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data: songs, error } = await query

    if (error) {
      console.error('Error fetching songs:', error)
      throw new Error('Failed to fetch songs')
    }

    // Transform data to match frontend interface
    return songs?.map(song => ({
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
  } catch (error) {
    console.error('Error in fetchSongs:', error)
    throw error
  }
}

export async function fetchSongById(id: string): Promise<Song | null> {
  try {
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
      return null
    }

    // Transform data to match frontend interface
    return {
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
  } catch (error) {
    console.error('Error in fetchSongById:', error)
    return null
  }
}

export async function searchSongs(query: string, language?: string): Promise<Song[]> {
  try {
    let supabaseQuery = supabase
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
      .textSearch('title', query, {
        type: 'websearch',
        config: 'english'
      })

    if (language) {
      supabaseQuery = supabaseQuery.eq('language', language)
    }

    const { data: songs, error } = await supabaseQuery

    if (error) {
      console.error('Error searching songs:', error)
      throw new Error('Failed to search songs')
    }

    // Transform data to match frontend interface
    return songs?.map(song => ({
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
  } catch (error) {
    console.error('Error in searchSongs:', error)
    throw error
  }
}

export async function updateViewCount(songId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('songs')
      .update({
        view_count: supabase.raw('view_count + 1'),
        updated_at: new Date().toISOString(),
      })
      .eq('id', songId)
      .select('view_count')
      .single()

    if (error) {
      console.error('Error updating view count:', error)
      throw new Error('Failed to update view count')
    }

    return data.view_count
  } catch (error) {
    console.error('Error in updateViewCount:', error)
    throw error
  }
}

export async function fetchTrendingSongs(limit: number = 20): Promise<Song[]> {
  try {
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
      throw new Error('Failed to fetch trending songs')
    }

    // Transform data to match frontend interface
    return songs?.map(song => ({
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
  } catch (error) {
    console.error('Error in fetchTrendingSongs:', error)
    throw error
  }
}
