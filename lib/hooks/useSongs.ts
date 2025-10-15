"use client"

import { useState, useEffect, useCallback } from 'react'
import { fetchSongs, fetchSongById, searchSongs, fetchTrendingSongs, updateViewCount } from '@/lib/api/songs'
import type { Song } from '@/lib/types'
import { songCache } from '@/lib/services/song-cache'

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

// Hook to initialize cache with popular songs
export function useCacheInitialization() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)

  const initializeCache = useCallback(async () => {
    if (isInitialized || isInitializing) return

    setIsInitializing(true)
    try {
      // Check if cache needs refresh
      if (songCache.needsFullSync() || !songCache.isCacheEffective()) {
        // Load trending songs and popular songs to populate cache (200 total)
        const [trendingSongs, popularSongs] = await Promise.all([
          fetchTrendingSongs(100), // Get 100 trending songs
          fetchSongs({ limit: 100, offset: 0 }) // Get 100 popular songs
        ])

        // Add to cache
        songCache.addSongs(trendingSongs)
        songCache.addSongs(popularSongs)
        songCache.setLastFullSync()
      }
      
      setIsInitialized(true)
    } catch (error) {
      console.error('Error initializing cache:', error)
    } finally {
      setIsInitializing(false)
    }
  }, [isInitialized, isInitializing])

  useEffect(() => {
    initializeCache()
  }, [initializeCache])

  return {
    isInitialized,
    isInitializing,
    initializeCache,
    cacheStats: songCache.getCacheStats()
  }
}

export function useOptimizedSearch() {
  const [results, setResults] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentSongs, setRecentSongs] = useState<Song[]>([])
  const [searchCache, setSearchCache] = useState<Map<string, Song[]>>(new Map())

  // Load recent songs from history
  const loadRecentSongs = useCallback(async () => {
    try {
      // Get recent song IDs from localStorage
      const recentIds = JSON.parse(localStorage.getItem('gnc_anonymous_history') || '[]')
      if (recentIds.length > 0) {
        // Try to get from cache first
        const cachedSongs: Song[] = []
        const missingIds: string[] = []

        for (const id of recentIds.slice(0, 10)) {
          const cachedSong = songCache.getSong(id)
          if (cachedSong) {
            // Convert metadata back to full song object
            cachedSongs.push({
              id: cachedSong.id,
              title: cachedSong.title,
              titleTransliteration: cachedSong.titleTransliteration,
              artist: {
                id: cachedSong.artist.id,
                name: cachedSong.artist.name,
                photoUrl: '', // Not cached
                totalSongs: 0,
                totalViews: 0,
              },
              language: cachedSong.language,
              tags: cachedSong.tags,
              lyrics: [], // Not cached
              chords: [], // Not cached
              originalKey: cachedSong.originalKey,
              thumbnail: cachedSong.thumbnail,
              hasVideo: cachedSong.hasVideo,
              videoUrl: '', // Not cached
              youtubeViews: 0, // Not cached
              youtubeLikes: 0, // Not cached
              releaseDate: '', // Not cached
              viewCount: cachedSong.viewCount,
              trending: cachedSong.trending,
            })
          } else {
            missingIds.push(id)
          }
        }

        // Fetch missing songs from backend
        if (missingIds.length > 0) {
          const fetchedSongs = await Promise.all(
            missingIds.map(async (id: string) => {
              try {
                return await fetchSongById(id)
              } catch {
                return null
              }
            })
          )
          const validFetchedSongs = fetchedSongs.filter(Boolean) as Song[]
          
          // Add to cache
          songCache.addSongs(validFetchedSongs)
          
          setRecentSongs([...cachedSongs, ...validFetchedSongs])
        } else {
          setRecentSongs(cachedSongs)
        }
      }
    } catch (error) {
      console.error('Error loading recent songs:', error)
    }
  }, [])

  const search = useCallback(async (query: string, language?: string) => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      // First, try cache search
      const cacheResults = songCache.search(query, language)
      
      if (cacheResults.length > 0 && songCache.isCacheEffective()) {
        // Convert metadata back to full song objects
        const fullSongs = await Promise.all(
          cacheResults.map(async (metadata) => {
            // Try to get full song data from cache or fetch if needed
            const fullSong = await fetchSongById(metadata.id)
            return fullSong
          })
        )
        
        const validSongs = fullSongs.filter(Boolean) as Song[]
        setResults(validSongs)
        setLoading(false)
        return
      }

      // Cache miss or insufficient data - search backend
      const backendResults = await searchSongs(query, language, 20, 0)
      setResults(backendResults)
      
      // Add new songs to cache
      songCache.addSongs(backendResults)
      songCache.setLastFullSync()
      
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

  // Load recent songs on mount
  useEffect(() => {
    loadRecentSongs()
  }, [loadRecentSongs])

  return {
    results,
    recentSongs,
    loading,
    error,
    search,
    clearResults,
  }
}

// Hook for lazy loading song lists - metadata first, then full data on demand
export function useLazySongList() {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingFullSongs, setLoadingFullSongs] = useState<Set<string>>(new Set())

  // Load songs with metadata only (lightweight)
  const loadSongs = useCallback(async (options: UseSongsOptions = {}) => {
    setLoading(true)
    setError(null)

    try {
      // First try to get from cache
      if (songCache.isCacheEffective()) {
        // Use cached metadata for display
        const cachedSongs = songCache.search('', options.language)
        if (cachedSongs.length > 0) {
          // Convert metadata back to lightweight song objects
          const lightweightSongs = cachedSongs.map(metadata => ({
            id: metadata.id,
            title: metadata.title,
            titleTransliteration: metadata.titleTransliteration,
            artist: {
              id: metadata.artist.id,
              name: metadata.artist.name,
              photoUrl: '',
              totalSongs: 0,
              totalViews: 0,
            },
            language: metadata.language,
            tags: metadata.tags,
            lyrics: [], // Empty - will be loaded on demand
            chords: [], // Empty - will be loaded on demand
            originalKey: metadata.originalKey,
            thumbnail: metadata.thumbnail,
            hasVideo: metadata.hasVideo,
            videoUrl: '',
            youtubeViews: 0,
            youtubeLikes: 0,
            releaseDate: '',
            viewCount: metadata.viewCount,
            trending: metadata.trending,
          }))
          setSongs(lightweightSongs)
          setLoading(false)
          return
        }
      }

      // Cache miss - fetch from backend
      const fetchedSongs = await fetchSongs(options)
      setSongs(fetchedSongs)
      
      // Add to cache
      songCache.addSongs(fetchedSongs)
      songCache.setLastFullSync()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load songs')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load full song data (lyrics and chords) on demand
  const loadFullSong = useCallback(async (songId: string): Promise<Song | null> => {
    // Check if already loading
    if (loadingFullSongs.has(songId)) {
      return null
    }

    // Check if full song is cached
    const cachedSong = songCache.getFullSong(songId)
    if (cachedSong) {
      return cachedSong
    }

    setLoadingFullSongs(prev => new Set(prev).add(songId))

    try {
      // Fetch full song data from backend
      const fullSong = await fetchSongById(songId)
      
      // Cache the full song data
      songCache.addFullSong(fullSong)
      
      // Update the song in the list with full data
      setSongs(prevSongs => 
        prevSongs.map(song => 
          song.id === songId ? fullSong : song
        )
      )
      
      return fullSong
    } catch (err) {
      console.error('Error loading full song:', err)
      return null
    } finally {
      setLoadingFullSongs(prev => {
        const newSet = new Set(prev)
        newSet.delete(songId)
        return newSet
      })
    }
  }, [loadingFullSongs])

  const isSongFullyLoaded = useCallback((songId: string): boolean => {
    const song = songs.find(s => s.id === songId)
    return song ? (song.lyrics.length > 0 && song.chords.length > 0) : false
  }, [songs])

  const isSongLoading = useCallback((songId: string): boolean => {
    return loadingFullSongs.has(songId)
  }, [loadingFullSongs])

  return {
    songs,
    loading,
    error,
    loadSongs,
    loadFullSong,
    isSongFullyLoaded,
    isSongLoading,
  }
}

// Hook for fetching language counts
export function useLanguageCounts() {
  const [languageCounts, setLanguageCounts] = useState<Record<string, number>>({})
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCounts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/songs/counts')
      if (!response.ok) {
        throw new Error('Failed to fetch language counts')
      }

      const data = await response.json()
      setLanguageCounts(data.languageCounts)
      setTotalCount(data.totalCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch counts')
      console.error('Error fetching language counts:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  return {
    languageCounts,
    totalCount,
    loading,
    error,
    refetch: fetchCounts,
  }
}

// Hook for infinite scroll loading of all songs
export function useInfiniteSongs() {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  const ITEMS_PER_PAGE = 20

  const loadSongs = useCallback(async (language?: string, reset = false) => {
    if (reset) {
      setSongs([])
      setCurrentPage(0)
      setHasMore(true)
    }

    const page = reset ? 0 : currentPage
    setLoading(reset)
    setLoadingMore(!reset)
    setError(null)

    try {
      const response = await fetch(`/api/songs?language=${language || 'all'}&limit=${ITEMS_PER_PAGE}&offset=${page * ITEMS_PER_PAGE}`)
      if (!response.ok) {
        throw new Error('Failed to fetch songs')
      }

      const data = await response.json()
      const newSongs = data.songs || []

      if (reset) {
        setSongs(newSongs)
        setTotalCount(data.totalCount || 0)
      } else {
        setSongs(prev => [...prev, ...newSongs])
      }

      setHasMore(newSongs.length === ITEMS_PER_PAGE)
      setCurrentPage(page + 1)

      // Add to cache
      songCache.addSongs(newSongs)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load songs')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [currentPage])

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadSongs()
    }
  }, [loadingMore, hasMore, loadSongs])

  const reset = useCallback((language?: string) => {
    loadSongs(language, true)
  }, [loadSongs])

  return {
    songs,
    loading,
    loadingMore,
    error,
    hasMore,
    totalCount,
    loadMore,
    reset,
  }
}
