"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { InMemorySearchEngine, type InMemorySearchResult } from '@/lib/services/in-memory-search-engine'
import type { Song } from '@/lib/types'

interface HybridSearchResult {
  song: Song
  score: number
  matchType: 'exact' | 'prefix' | 'contains' | 'fuzzy'
  field: 'title' | 'titleTransliteration' | 'artist' | 'lyrics'
  source: 'client' | 'server'
}

interface UseHybridSearchOptions {
  language?: string
  maxResults?: number
  enableServerFallback?: boolean
  serverDebounceMs?: number
}

interface UseHybridSearchReturn {
  query: string
  results: HybridSearchResult[]
  loading: boolean
  error: string | null
  search: (query: string) => void
  clearSearch: () => void
  hasResults: boolean
  isEmpty: boolean
  isSearching: boolean
  getSearchStats: () => any
  getTopResults: (limit?: number) => HybridSearchResult[]
  getMatchQuality: (score: number) => { label: string; color: string }
  getSearchInsights: () => string[]
}

export function useHybridSearch({
  language,
  maxResults = 20,
  enableServerFallback = true,
  serverDebounceMs = 100
}: UseHybridSearchOptions = {}): UseHybridSearchReturn {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<HybridSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const searchEngine = useRef<InMemorySearchEngine | null>(null)
  const serverDebounceTimer = useRef<NodeJS.Timeout | null>(null)
  const abortController = useRef<AbortController | null>(null)
  const isInitialized = useRef(false)
  const currentSearchId = useRef<string | null>(null)

  // Track state changes for debugging
  useEffect(() => {
    console.log('🔍 [STATE] isSearching changed to:', isSearching)
  }, [isSearching])

  // Initialize search engine with all songs
  useEffect(() => {
    const initializeSearchEngine = async () => {
      if (isInitialized.current) return

      try {
        setLoading(true)
        
        // Fetch all songs for in-memory indexing
        const response = await fetch('/api/songs?limit=10000')
        if (!response.ok) {
          throw new Error('Failed to load songs for search')
        }

        const data = await response.json()
        const songs = data.songs || []

        if (songs.length === 0) {
          console.warn('No songs available for search indexing')
          return
        }

        // Initialize search engine
        searchEngine.current = new InMemorySearchEngine()
        await searchEngine.current.initialize(songs)
        
        isInitialized.current = true
        console.log(`Hybrid search initialized with ${songs.length} songs`)
        
      } catch (err) {
        console.error('Failed to initialize search engine:', err)
        setError(err instanceof Error ? err.message : 'Search initialization failed')
      } finally {
        setLoading(false)
      }
    }

    initializeSearchEngine()
  }, [])

  // Perform instant client-side search
  const performClientSearch = useCallback((searchQuery: string): HybridSearchResult[] => {
    if (!searchEngine.current || !searchQuery.trim()) return []

    const clientResults = searchEngine.current.search(searchQuery, language, maxResults)
    
    return clientResults.map(result => ({
      ...result,
      source: 'client' as const
    }))
  }, [language, maxResults])

  // Perform server-side search as fallback
  const performServerSearch = useCallback(async (searchQuery: string): Promise<HybridSearchResult[]> => {
    if (!enableServerFallback) return []

    try {
      // Cancel previous request
      if (abortController.current) {
        abortController.current.abort()
      }

      abortController.current = new AbortController()

      const params = new URLSearchParams({
        q: searchQuery,
        limit: maxResults.toString(),
        offset: '0'
      })

      if (language) {
        params.append('language', language)
      }

      const response = await fetch(`/api/songs/search?${params}`, {
        signal: abortController.current.signal
      })

      if (!response.ok) {
        throw new Error(`Server search failed: ${response.statusText}`)
      }

      const data = await response.json()
      const serverResults = (data.songs || []).map((result: any) => ({
        song: result.song,
        score: result.score,
        matchType: result.score >= 800 ? 'exact' : result.score >= 600 ? 'prefix' : 'contains',
        field: 'titleTransliteration' as const, // Server results are primarily from transliteration
        source: 'server' as const
      }))

      return serverResults

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return [] // Request was cancelled
      }
      console.error('Server search error:', err)
      return []
    }
  }, [enableServerFallback, language, maxResults])

  // Main search function with hybrid approach
  const search = useCallback((searchQuery: string) => {
    console.log('🔍 [SEARCH] Starting search for:', searchQuery)
    setQuery(searchQuery)
    setError(null)

    if (!searchQuery.trim()) {
      console.log('🔍 [SEARCH] Empty query - clearing states')
      setResults([])
      setIsSearching(false)
      currentSearchId.current = null
      return
    }

    // Generate unique search ID to prevent race conditions
    const searchId = `${Date.now()}-${Math.random()}`
    currentSearchId.current = searchId
    console.log('🔍 [SEARCH] Generated search ID:', searchId)

    // Start search process - set loading to true for entire process
    console.log('🔍 [SEARCH] Setting isSearching = true for entire search process')
    setIsSearching(true)

    // Clear any existing timer to prevent race conditions
    if (serverDebounceTimer.current) {
      console.log('🔍 [SEARCH] Clearing previous timer to prevent race conditions')
      clearTimeout(serverDebounceTimer.current)
    }

    // 1. Instant client-side search (no debounce)
    console.log('🔍 [SEARCH] Performing client search...')
    const clientResults = performClientSearch(searchQuery)
    console.log('🔍 [SEARCH] Client results:', clientResults.length)
    
    if (clientResults.length > 0) {
      setResults(clientResults)
      
      // If we have good client results, we're done
      if (clientResults.length >= 5 || clientResults.some(r => r.score >= 800)) {
        console.log('🔍 [SEARCH] Good client results found - ending search')
        setIsSearching(false)
        currentSearchId.current = null
        return
      }
    }

    // 2. Server search as fallback (with debounce)
    if (enableServerFallback) {
      console.log('🔍 [SEARCH] Setting up server search with debounce:', serverDebounceMs + 'ms')
      
      serverDebounceTimer.current = setTimeout(async () => {
        // Check if this is still the current search
        if (currentSearchId.current !== searchId) {
          console.log('🔍 [SERVER] Search cancelled - different search in progress')
          return
        }
        
        console.log('🔍 [SERVER] Starting server search for:', searchQuery)
        console.log('🔍 [SERVER] isSearching remains true during server search')
        try {
          const serverResults = await performServerSearch(searchQuery)
          console.log('🔍 [SERVER] Server search completed, results:', serverResults.length)
          
          // Check again if this is still the current search
          if (currentSearchId.current !== searchId) {
            console.log('🔍 [SERVER] Search cancelled after server completion - different search in progress')
            return
          }
          
          if (serverResults.length > 0) {
            // Merge client and server results, removing duplicates
            const existingSongIds = new Set(clientResults.map(r => r.song.id))
            const newServerResults = serverResults.filter(r => !existingSongIds.has(r.song.id))
            
            const mergedResults = [...clientResults, ...newServerResults]
              .sort((a, b) => b.score - a.score)
              .slice(0, maxResults)
            
            console.log('🔍 [SERVER] Merged results:', mergedResults.length)
            setResults(mergedResults)
          } else if (clientResults.length === 0) {
            // No results from either source
            console.log('🔍 [SERVER] No results from either source')
            setResults([])
          }
          
        } catch (err) {
          console.error('🔍 [SERVER] Server search failed:', err)
          // Keep client results if server fails
          if (clientResults.length > 0) {
            setResults(clientResults)
          }
        } finally {
          // Only set isSearching to false if this is still the current search
          if (currentSearchId.current === searchId) {
            console.log('🔍 [SERVER] Server search finished - setting isSearching to false')
            setIsSearching(false)
            currentSearchId.current = null
          } else {
            console.log('🔍 [SERVER] Search already cancelled - not updating isSearching')
          }
        }
      }, serverDebounceMs)
    } else {
      // No server fallback, search is complete after client search
      console.log('🔍 [SEARCH] No server fallback - ending search after client')
      setIsSearching(false)
      currentSearchId.current = null
    }
  }, [performClientSearch, performServerSearch, enableServerFallback, serverDebounceMs, maxResults])

  // Clear search
  const clearSearch = useCallback(() => {
    console.log('🔍 [CLEAR] Clearing search - setting isSearching to false')
    setQuery('')
    setResults([])
    setError(null)
    setIsSearching(false)
    currentSearchId.current = null
    
    // Clear timers and abort requests
    if (serverDebounceTimer.current) {
      clearTimeout(serverDebounceTimer.current)
      serverDebounceTimer.current = null
    }
    
    if (abortController.current) {
      abortController.current.abort()
      abortController.current = null
    }
  }, [])

  // Get search statistics
  const getSearchStats = useCallback(() => {
    const clientStats = searchEngine.current?.getStats() || { songCount: 0, cacheSize: 0, trieSize: 0 }
    
    return {
      resultsCount: results.length,
      hasResults: results.length > 0,
      clientSongCount: clientStats.songCount,
      cacheSize: clientStats.cacheSize,
      trieSize: clientStats.trieSize,
      clientResults: results.filter(r => r.source === 'client').length,
      serverResults: results.filter(r => r.source === 'server').length,
      topScore: results.length > 0 ? results[0].score : 0,
      averageScore: results.length > 0 
        ? results.reduce((sum, r) => sum + r.score, 0) / results.length 
        : 0
    }
  }, [results])

  // Get top results
  const getTopResults = useCallback((limit: number = 10) => {
    return results.slice(0, limit)
  }, [results])

  // Get match quality description
  const getMatchQuality = useCallback((score: number) => {
    if (score >= 1000) return { label: 'Perfect Match', color: 'success' }
    if (score >= 900) return { label: 'Exact Match', color: 'success' }
    if (score >= 800) return { label: 'Great Match', color: 'info' }
    if (score >= 600) return { label: 'Good Match', color: 'warning' }
    if (score >= 400) return { label: 'Fair Match', color: 'default' }
    return { label: 'Partial Match', color: 'default' }
  }, [])

  // Get search insights
  const getSearchInsights = useCallback(() => {
    const stats = getSearchStats()
    const insights = []
    
    if (stats.resultsCount > 0) {
      insights.push(`${stats.resultsCount} results found`)
      
      if (stats.clientResults > 0) {
        insights.push(`${stats.clientResults} instant results`)
      }
      
      if (stats.serverResults > 0) {
        insights.push(`${stats.serverResults} server results`)
      }
      
      if (stats.topScore >= 1000) {
        insights.push('Perfect matches found')
      } else if (stats.topScore >= 800) {
        insights.push('High relevance results')
      }
    }
    
    return insights
  }, [getSearchStats])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (serverDebounceTimer.current) {
        clearTimeout(serverDebounceTimer.current)
      }
      if (abortController.current) {
        abortController.current.abort()
      }
    }
  }, [])

  return {
    query,
    results,
    loading,
    error,
    search,
    clearSearch,
    hasResults: results.length > 0,
    isEmpty: query.length > 0 && results.length === 0 && !isSearching,
    isSearching,
    getSearchStats,
    getTopResults,
    getMatchQuality,
    getSearchInsights
  }
}
