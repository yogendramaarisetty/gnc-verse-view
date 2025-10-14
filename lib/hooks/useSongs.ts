"use client"

import { useState, useEffect, useCallback } from 'react'
import { fetchSongs, fetchSongById, searchSongs, fetchTrendingSongs, updateViewCount } from '@/lib/api/songs'
import type { Song } from '@/lib/types'

export interface UseSongsOptions {
  language?: string
  trending?: boolean
  search?: string
  limit?: number
  offset?: number
}

export function useSongs(options: UseSongsOptions = {}) {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSongs = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await fetchSongs(options)
      setSongs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load songs')
    } finally {
      setLoading(false)
    }
  }, [options.language, options.trending, options.search, options.limit, options.offset])

  useEffect(() => {
    loadSongs()
  }, [loadSongs])

  const refresh = useCallback(() => {
    loadSongs()
  }, [loadSongs])

  return {
    songs,
    loading,
    error,
    refresh,
  }
}

export function useSong(songId: string | null) {
  const [song, setSong] = useState<Song | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!songId) {
      setSong(null)
      return
    }

    const loadSong = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const data = await fetchSongById(songId)
        setSong(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load song')
      } finally {
        setLoading(false)
      }
    }

    loadSong()
  }, [songId])

  const trackView = useCallback(async () => {
    if (!songId) return
    
    try {
      await updateViewCount(songId)
    } catch (err) {
      console.error('Failed to track view:', err)
    }
  }, [songId])

  return {
    song,
    loading,
    error,
    trackView,
  }
}

export function useSongSearch() {
  const [results, setResults] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (query: string, language?: string) => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const data = await searchSongs(query, language)
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const clearResults = useCallback(() => {
    setResults([])
    setError(null)
  }, [])

  return {
    results,
    loading,
    error,
    search,
    clearResults,
  }
}

export function useTrendingSongs(limit: number = 20) {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTrending = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const data = await fetchTrendingSongs(limit)
        setSongs(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trending songs')
      } finally {
        setLoading(false)
      }
    }

    loadTrending()
  }, [limit])

  return {
    songs,
    loading,
    error,
  }
}
