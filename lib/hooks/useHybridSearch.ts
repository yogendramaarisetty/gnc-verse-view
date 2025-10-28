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
    // State tracking removed for production
  }, [isSearching])

  // Initialize search engine with all songs
  useEffect(() => {
    const initializeSearchEngine = async () => {
      if (isInitialized.current) return

      try {
        setLoading(true)
        
        // Log environment details
        console.log('🚀 Initializing search engine:', {
          environment: process.env.NODE_ENV,
          isVercel: process.env.VERCEL === '1',
          timestamp: new Date().toISOString()
        })
        
        // Fetch songs with timeout
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000) // 15s timeout
        
        // Environment-specific limit to avoid Vercel timeout
        const limit = process.env.VERCEL === '1' ? 5000 : 10000
        const response = await fetch(`/api/songs?limit=${limit}`, { 
          signal: controller.signal 
        })
        clearTimeout(timeout)
        
        if (!response.ok) {
          throw new Error(`API returned ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        const songs = data.songs || []

        // Log loaded songs details
        console.log('📊 Songs loaded for search:', {
          count: songs.length,
          sampleTitles: songs.slice(0, 5).map((s: any) => ({
            title: s.title,
            transliteration: s.titleTransliteration
          })),
          hasBangaram: songs.some((s: any) => 
            s.titleTransliteration?.toLowerCase().includes('bangaram')
          )
        })

        if (songs.length === 0) {
          console.warn('⚠️ No songs loaded - using server-only search mode')
          isInitialized.current = true
          return
        }

        // Initialize with progress tracking
        const startTime = Date.now()
        searchEngine.current = new InMemorySearchEngine()
        await searchEngine.current.initialize(songs)
        const initTime = Date.now() - startTime
        
        console.log('✅ Search engine initialized:', {
          songCount: songs.length,
          initTime: `${initTime}ms`
        })
        
        isInitialized.current = true
        
      } catch (err) {
        console.error('❌ Search engine initialization failed:', {
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined
        })
        setError(err instanceof Error ? err.message : 'Search initialization failed')
        // Mark as initialized to allow server-only mode
        isInitialized.current = true
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
    setQuery(searchQuery)
    setError(null)

    if (!searchQuery.trim()) {
      setResults([])
      setIsSearching(false)
      currentSearchId.current = null
      return
    }

    // Log search details
    console.log('🔍 Search initiated:', {
      query: searchQuery,
      hasSearchEngine: !!searchEngine.current,
      environment: process.env.NODE_ENV,
      isVercel: process.env.VERCEL === '1'
    })

    // Generate unique search ID to prevent race conditions
    const searchId = `${Date.now()}-${Math.random()}`
    currentSearchId.current = searchId

    // Start search process - set loading to true for entire process
    setIsSearching(true)

    // Clear any existing timer to prevent race conditions
    if (serverDebounceTimer.current) {
      clearTimeout(serverDebounceTimer.current)
    }

    // 1. Try client-side search
    if (searchEngine.current) {
      const clientResults = performClientSearch(searchQuery)
      
      console.log('📱 Client search results:', {
        count: clientResults.length,
        topResults: clientResults.slice(0, 3).map(r => ({
          title: r.song.title,
          transliteration: r.song.titleTransliteration,
          score: r.score,
          matchType: r.matchType,
          field: r.field
        }))
      })
      
      if (clientResults.length > 0) {
        setResults(clientResults)
        
        if (clientResults.length >= 5 || clientResults.some(r => r.score >= 800)) {
          console.log('✅ Using client results (sufficient quality)')
          setIsSearching(false)
          currentSearchId.current = null
          return
        }
      }
    } else {
      console.warn('⚠️ Client search engine not available')
    }

    // 2. Server search fallback with logging
    if (enableServerFallback) {
      serverDebounceTimer.current = setTimeout(async () => {
        if (currentSearchId.current !== searchId) return
        
        try {
          console.log('🌐 Starting server search')
          const serverResults = await performServerSearch(searchQuery)
          
          console.log('🌐 Server search results:', {
            count: serverResults.length,
            topResults: serverResults.slice(0, 3).map(r => ({
              title: r.song.title,
              transliteration: r.song.titleTransliteration,
              score: r.score
            }))
          })
          
          // Merge and log final results
          if (currentSearchId.current === searchId) {
            const clientResults = searchEngine.current ? performClientSearch(searchQuery) : []
            const existingIds = new Set(clientResults.map(r => r.song.id))
            const newServerResults = serverResults.filter(r => !existingIds.has(r.song.id))
            
            const mergedResults = [...clientResults, ...newServerResults]
              .sort((a, b) => b.score - a.score)
              .slice(0, maxResults)
            
            console.log('🔄 Final merged results:', {
              clientCount: clientResults.length,
              serverCount: newServerResults.length,
              totalCount: mergedResults.length,
              topResult: mergedResults[0] ? {
                title: mergedResults[0].song.title,
                score: mergedResults[0].score,
                source: mergedResults[0].source
              } : null
            })
            
            setResults(mergedResults)
          }
        } catch (err) {
          console.error('❌ Server search failed:', err)
          if (searchEngine.current) {
            setResults(performClientSearch(searchQuery))
          }
        } finally {
          if (currentSearchId.current === searchId) {
            setIsSearching(false)
            currentSearchId.current = null
          }
        }
      }, serverDebounceMs)
    } else {
      // No server fallback, search is complete after client search
      setIsSearching(false)
      currentSearchId.current = null
    }
  }, [performClientSearch, performServerSearch, enableServerFallback, serverDebounceMs, maxResults])

  // Clear search
  const clearSearch = useCallback(() => {
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
