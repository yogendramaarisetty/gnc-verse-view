"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Song } from '@/lib/types'
import { searchCache, cacheUtils } from '@/lib/services/search-cache'

interface BackendSearchResult {
  song: Song
  score: number
  matches: {
    title?: number
    titleTransliteration?: number
    artist?: number
    lyrics?: number
    tags?: number
  }
  highlights: {
    title: string
    artist: string
    tags: string[]
  }
}

interface BackendSearchResponse {
  songs: BackendSearchResult[]
  cached?: boolean
  cacheHits?: number
  totalResults?: number
}

interface UseBackendSearchOptions {
  language?: string
  debounceMs?: number
  minQueryLength?: number
  maxResults?: number
}

interface UseBackendSearchReturn {
  query: string
  results: BackendSearchResult[]
  loading: boolean
  error: string | null
  cacheStats: any
  search: (searchQuery: string) => void
  clearSearch: () => void
  clearBackendCache: () => void
  getCacheStats: () => any
  hasResults: boolean
  isSearching: boolean
  isEmpty: boolean
  isPerfectMatch: boolean
  isBackendLoading: boolean
  getSearchStats: () => any
  getTopResults: (limit?: number) => BackendSearchResult[]
  getResultsByScore: (minScore: number) => BackendSearchResult[]
  isSongMatch: (song: any, query: string) => boolean
  getSongMatchDetails: (song: any, query: string) => any
  getMatchQuality: (score: number) => { label: string; color: string }
  getSearchInsights: () => string[]
}

interface CacheEntry {
  data: BackendSearchResult[]
  timestamp: number
  hits: number
}

export function useBackendSearch({
  language,
  debounceMs = 300,
  minQueryLength = 1,
  maxResults = 20
}: UseBackendSearchOptions = {}): UseBackendSearchReturn {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BackendSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cacheStats, setCacheStats] = useState<any>(null)
  const [cachedResults, setCachedResults] = useState<BackendSearchResult[]>([])
  const [isBackendLoading, setIsBackendLoading] = useState(false)
  
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const abortController = useRef<AbortController | null>(null)
  const pendingRequests = useRef<Set<string>>(new Set())
  const lastQuery = useRef<string>('')

  // Enhanced cache management with statistics
  const updateCacheStats = useCallback(() => {
    const stats = searchCache.getStats()
    setCacheStats({
      totalEntries: stats.totalEntries,
      totalSize: stats.totalSize,
      hitRate: stats.hitRate,
      missRate: stats.missRate,
      averageAccessTime: stats.averageAccessTime
    })
  }, [])

  // Reorder results based on relevance and match rate
  const reorderResultsByRelevance = useCallback((newResults: BackendSearchResult[], searchQuery: string) => {
    if (!searchQuery.trim()) return newResults

    const queryLower = searchQuery.toLowerCase()
    
    return newResults.sort((a, b) => {
      // Calculate relevance score for each result
      const scoreA = calculateRelevanceScore(a, queryLower)
      const scoreB = calculateRelevanceScore(b, queryLower)
      
      // Sort by relevance score (highest first)
      return scoreB - scoreA
    })
  }, [])

  // Calculate relevance score for a result
  const calculateRelevanceScore = useCallback((result: BackendSearchResult, query: string) => {
    let score = result.score || 0
    
    const title = result.song?.title?.toLowerCase() || ''
    const artist = result.song?.artist?.name?.toLowerCase() || ''
    const transliteration = result.song?.titleTransliteration?.toLowerCase() || ''
    
    // Exact title match gets highest score
    if (title.includes(query)) {
      score += 100
      if (title.startsWith(query)) score += 50 // Starts with gets bonus
    }
    
    // Exact transliteration match gets high score
    if (transliteration.includes(query)) {
      score += 80
      if (transliteration.startsWith(query)) score += 40
    }
    
    // Artist match gets medium score
    if (artist.includes(query)) {
      score += 60
      if (artist.startsWith(query)) score += 30
    }
    
    // Partial matches get lower scores
    const titleWords = title.split(' ')
    const queryWords = query.split(' ')
    const matchingWords = titleWords.filter(word => 
      queryWords.some(qWord => word.includes(qWord))
    ).length
    
    score += matchingWords * 20
    
    return score
  }, [])

  // Get similar cached results for immediate display
  const getSimilarCachedResults = useCallback((searchQuery: string) => {
    const allKeys = searchCache.keys()
    const similarResults: BackendSearchResult[] = []
    
    for (const key of allKeys) {
      if (key.startsWith('search:')) {
        const cachedData = searchCache.get<BackendSearchResult[]>(key)
        if (cachedData && cachedData.length > 0) {
          // Check if this cached result might be relevant to current query
          const relevantResults = cachedData.filter(result => {
            if (!result.song) return false
            
            const title = result.song.title?.toLowerCase() || ''
            const artist = result.song.artist?.name?.toLowerCase() || ''
            const transliteration = result.song.titleTransliteration?.toLowerCase() || ''
            const query = searchQuery.toLowerCase()
            
            return title.includes(query) || 
                   artist.includes(query) || 
                   transliteration.includes(query) ||
                   query.includes(title.split(' ')[0]) ||
                   query.includes(artist.split(' ')[0])
          })
          
          similarResults.push(...relevantResults)
        }
      }
    }
    
    // Remove duplicates and limit results
    const uniqueResults = similarResults.filter((result, index, self) => 
      index === self.findIndex(r => r.song?.id === result.song?.id)
    )
    
    return uniqueResults.slice(0, maxResults)
  }, [maxResults])

  // Check if query is valid and worth searching
  const isValidQuery = useCallback((searchQuery: string) => {
    const trimmed = searchQuery.trim()
    if (!trimmed || trimmed.length < minQueryLength) return false
    
    // Skip if query is too similar to last query (fuzzy matching)
    if (lastQuery.current && 
        Math.abs(trimmed.length - lastQuery.current.length) <= 1 &&
        trimmed.toLowerCase().includes(lastQuery.current.toLowerCase())) {
      return false
    }
    
    return true
  }, [minQueryLength])

  // Perform backend search with optimizations
  const performSearch = useCallback(async (searchQuery: string) => {
    const trimmedQuery = searchQuery.trim()
    
    // Early exit for invalid queries
    if (!isValidQuery(trimmedQuery)) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    const cacheKey = cacheUtils.createSearchKey(trimmedQuery, language, maxResults, 0)
    
    // Check enhanced cache first
    const cachedResults = searchCache.get<BackendSearchResult[]>(cacheKey)
    if (cachedResults) {
      // Validate cached data before using it
      const validCachedResults = cachedResults.filter(result => 
        result && 
        result.song && 
        result.song.id && 
        result.song.title
      )
      
      if (validCachedResults.length > 0) {
        // Reorder cached results by relevance
        const reorderedResults = reorderResultsByRelevance(validCachedResults, trimmedQuery)
        setResults(reorderedResults)
        setCachedResults(reorderedResults)
        setLoading(false)
        setError(null)
        updateCacheStats()
        return
      } else {
        // Remove invalid cache entry
        searchCache.delete(cacheKey)
      }
    }

    // Show cached results from similar queries while backend loads
    const similarCachedResults = getSimilarCachedResults(trimmedQuery)
    if (similarCachedResults.length > 0) {
      const reorderedSimilar = reorderResultsByRelevance(similarCachedResults, trimmedQuery)
      setCachedResults(reorderedSimilar)
      setResults(reorderedSimilar)
    }

    // Prevent duplicate requests
    if (pendingRequests.current.has(cacheKey)) {
      return
    }

    // Cancel previous request if still pending
    if (abortController.current) {
      abortController.current.abort()
    }

    // Create new abort controller
    abortController.current = new AbortController()
    pendingRequests.current.add(cacheKey)
    lastQuery.current = trimmedQuery

    setLoading(true)
    setIsBackendLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        q: trimmedQuery,
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
        throw new Error(`Search failed: ${response.statusText}`)
      }

      const data: BackendSearchResponse = await response.json()
      
      // Debug logging
      console.log('Search API Response:', {
        songsCount: data.songs?.length || 0,
        cached: data.cached,
        totalResults: data.totalResults,
        firstResult: data.songs?.[0]
      })
      
      // Validate and filter results to ensure they have valid song data
      const validResults = (data.songs || []).filter(result => 
        result && 
        result.song && 
        result.song.id && 
        result.song.title
      )
      
      console.log('Valid Results:', {
        validCount: validResults.length,
        invalidCount: (data.songs || []).length - validResults.length
      })
      
      // Reorder results by relevance before caching and displaying
      const reorderedResults = reorderResultsByRelevance(validResults, trimmedQuery)
      
      // Cache results with enhanced caching system
      searchCache.set(cacheKey, reorderedResults, undefined, ['search'])
      
      setResults(reorderedResults)
      setCachedResults(reorderedResults)
      updateCacheStats()
      
      // Update cache stats if available
      if (data.cached !== undefined) {
        setCacheStats({
          cached: data.cached,
          cacheHits: data.cacheHits,
          totalResults: data.totalResults
        })
      }
      
    } catch (err) {
      // Don't show error for aborted requests
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
    } finally {
      setLoading(false)
      setIsBackendLoading(false)
      pendingRequests.current.delete(cacheKey)
    }
  }, [language, minQueryLength, maxResults, isValidQuery, updateCacheStats])

  // Adaptive debounced search function
  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery)
    
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    
    // Show loading state immediately for valid queries
    if (searchQuery.trim().length >= minQueryLength) {
      setLoading(true)
      setError(null)
    }
    
    // Adaptive debounce timing based on query characteristics
    let adaptiveDebounceMs = debounceMs
    
    // Shorter debounce for shorter queries (user is likely still typing)
    if (searchQuery.length <= 3) {
      adaptiveDebounceMs = Math.max(debounceMs * 0.5, 150)
    }
    // Longer debounce for longer queries (user might be done typing)
    else if (searchQuery.length >= 10) {
      adaptiveDebounceMs = Math.min(debounceMs * 1.5, 600)
    }
    
    // Set new timer with adaptive timing
    debounceTimer.current = setTimeout(() => {
      performSearch(searchQuery)
    }, adaptiveDebounceMs)
  }, [performSearch, debounceMs, minQueryLength])

  // Clear search with proper cleanup
  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
    setLoading(false)
    
    // Clear debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
    
    // Cancel any pending requests
    if (abortController.current) {
      abortController.current.abort()
      abortController.current = null
    }
    
    // Clear pending requests
    pendingRequests.current.clear()
    lastQuery.current = ''
  }, [])

  // Clear backend cache with enhanced cache cleanup
  const clearBackendCache = useCallback(async () => {
    try {
      const response = await fetch('/api/search/cache?action=clear', {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to clear cache')
      }
      
      // Clear enhanced cache and reset state
      cacheUtils.clearSearchCache()
      pendingRequests.current.clear()
      lastQuery.current = ''
      setCacheStats(null)
      updateCacheStats()
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cache')
      return false
    }
  }, [updateCacheStats])

  // Cleanup effect for component unmounting
  useEffect(() => {
    return () => {
      // Clear timers and abort requests on unmount
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
      if (abortController.current) {
        abortController.current.abort()
      }
    }
  }, [])

  // Get enhanced cache statistics
  const getCacheStats = useCallback(async () => {
    try {
      // Get local cache stats
      const localStats = searchCache.getStats()
      
      // Get server cache stats
      const response = await fetch('/api/search/cache?action=stats')
      let serverStats = null
      
      if (response.ok) {
        const data = await response.json()
        serverStats = data.cacheStats
      }
      
      const combinedStats = {
        local: localStats,
        server: serverStats,
        totalEntries: localStats.totalEntries + (serverStats?.totalEntries || 0),
        totalSize: localStats.totalSize + (serverStats?.totalSize || 0),
        hitRate: localStats.hitRate,
        missRate: localStats.missRate
      }
      
      setCacheStats(combinedStats)
      return combinedStats
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get cache stats')
      return null
    }
  }, [])

  // Get search statistics
  const getSearchStats = useCallback(() => {
    const validResults = results.filter(r => r && r.song && r.song.id)
    return {
      resultsCount: validResults.length,
      hasResults: validResults.length > 0,
      topScore: validResults.length > 0 ? validResults[0].score : 0,
      averageScore: validResults.length > 0 
        ? validResults.reduce((sum, r) => sum + r.score, 0) / validResults.length 
        : 0,
      cacheStats
    }
  }, [results, cacheStats])

  // Get top results (highest scoring) with validation
  const getTopResults = useCallback((limit: number = 10) => {
    return results
      .filter(result => result && result.song && result.song.id)
      .slice(0, limit)
  }, [results])

  // Get results by score threshold
  const getResultsByScore = useCallback((minScore: number) => {
    return results
      .filter(result => result && result.song && result.song.id)
      .filter(result => result.score >= minScore)
  }, [results])

  // Check if query matches a specific song
  const isSongMatch = useCallback((songId: string) => {
    return results
      .filter(result => result && result.song && result.song.id)
      .some(result => result.song.id === songId)
  }, [results])

  // Get match details for a specific song
  const getSongMatchDetails = useCallback((songId: string) => {
    return results
      .filter(result => result && result.song && result.song.id)
      .find(result => result.song.id === songId)
  }, [results])

  // Get match quality description
  const getMatchQuality = useCallback((score: number) => {
    if (score >= 90) return { label: 'Perfect Match', color: 'success' }
    if (score >= 80) return { label: 'Excellent Match', color: 'success' }
    if (score >= 70) return { label: 'Great Match', color: 'info' }
    if (score >= 60) return { label: 'Good Match', color: 'warning' }
    if (score >= 50) return { label: 'Fair Match', color: 'default' }
    return { label: 'Partial Match', color: 'default' }
  }, [])

  // Get search insights
  const getSearchInsights = useCallback(() => {
    const stats = getSearchStats()
    const insights = []
    
    if (stats.resultsCount > 0) {
      insights.push(`${stats.resultsCount} results found`)
      
      if (stats.averageScore > 80) {
        insights.push('High relevance results')
      } else if (stats.averageScore > 60) {
        insights.push('Good relevance results')
      }
      
      if (stats.cacheStats?.cached) {
        insights.push('Cached results')
      }
    }
    
    return insights
  }, [getSearchStats])

  return {
    // State
    query,
    results,
    loading,
    error,
    cacheStats,
    
    // Actions
    search,
    clearSearch,
    clearBackendCache,
    getCacheStats,
    
    // Utilities
    getSearchStats,
    getTopResults,
    getResultsByScore,
    isSongMatch,
    getSongMatchDetails,
    getMatchQuality,
    getSearchInsights,
    
    // Computed
    hasResults: results.filter(r => r && r.song && r.song.id).length > 0,
    isSearching: loading,
    isEmpty: query.length > 0 && results.filter(r => r && r.song && r.song.id).length === 0 && !loading,
    isPerfectMatch: results.filter(r => r && r.song && r.song.id).length > 0 && results[0]?.score >= 90,
    isBackendLoading,
  }
}
