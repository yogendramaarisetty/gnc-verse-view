"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { createIDESearchEngine, type IDESearchResult } from '@/lib/utils/ide-search'
import type { Song } from '@/lib/types'

interface UseIDESearchOptions {
  songs: Song[]
  language?: string
  debounceMs?: number
  minQueryLength?: number
  maxResults?: number
}

export function useIDESearch({
  songs,
  language,
  debounceMs = 200, // Faster than regular search
  minQueryLength = 1,
  maxResults = 20
}: UseIDESearchOptions) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<IDESearchResult[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const searchEngine = useRef<any>(null)
  const searchCache = useRef<Map<string, IDESearchResult[]>>(new Map())
  const suggestionsCache = useRef<Map<string, string[]>>(new Map())

  // Initialize search engine when songs change
  useEffect(() => {
    if (songs.length > 0) {
      searchEngine.current = createIDESearchEngine(songs)
    }
  }, [songs])

  // Memoized filtered songs for current language
  const filteredSongs = useMemo(() => {
    if (!language) return songs
    return songs.filter(song => song.language === language)
  }, [songs, language])

  // Perform IDE-style search
  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < minQueryLength) {
      setResults([])
      setSuggestions([])
      return
    }

    const cacheKey = `${searchQuery.toLowerCase()}-${language || 'all'}`
    
    // Check cache first
    if (searchCache.current.has(cacheKey)) {
      setResults(searchCache.current.get(cacheKey)!)
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (!searchEngine.current) {
        throw new Error('Search engine not initialized')
      }

      // Perform IDE-style search
      const searchResults = searchEngine.current.search(searchQuery, language)
      
      // Limit results
      const limitedResults = searchResults.slice(0, maxResults)
      
      // Cache results
      searchCache.current.set(cacheKey, limitedResults)
      
      // Limit cache size
      if (searchCache.current.size > 100) {
        const firstKey = searchCache.current.keys().next().value
        searchCache.current.delete(firstKey)
      }
      
      setResults(limitedResults)
      
      // Get suggestions for autocomplete
      const searchSuggestions = searchEngine.current.getSuggestions(searchQuery, 8)
      setSuggestions(searchSuggestions)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [filteredSongs, language, minQueryLength, maxResults])

  // Debounced search function
  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery)
    
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    
    // Set new timer
    debounceTimer.current = setTimeout(() => {
      performSearch(searchQuery)
    }, debounceMs)
  }, [performSearch, debounceMs])

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setSuggestions([])
    setError(null)
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
  }, [])

  // Get search statistics
  const getSearchStats = useCallback(() => {
    return {
      totalSongs: filteredSongs.length,
      resultsCount: results.length,
      hasResults: results.length > 0,
      topScore: results.length > 0 ? results[0].score : 0,
      averageScore: results.length > 0 
        ? results.reduce((sum, r) => sum + r.score, 0) / results.length 
        : 0,
      matchTypes: results.reduce((acc, result) => {
        Object.values(result.matches).forEach(match => {
          if (match) {
            acc[match.type] = (acc[match.type] || 0) + 1
          }
        })
        return acc
      }, {} as Record<string, number>)
    }
  }, [filteredSongs.length, results])

  // Get top results (highest scoring)
  const getTopResults = useCallback((limit: number = 10) => {
    return results.slice(0, limit)
  }, [results])

  // Get results by score threshold
  const getResultsByScore = useCallback((minScore: number) => {
    return results.filter(result => result.score >= minScore)
  }, [results])

  // Get results by match type
  const getResultsByMatchType = useCallback((matchType: string) => {
    return results.filter(result => 
      Object.values(result.matches).some(match => match?.type === matchType)
    )
  }, [results])

  // Check if query matches a specific song
  const isSongMatch = useCallback((songId: string) => {
    return results.some(result => result.song.id === songId)
  }, [results])

  // Get match details for a specific song
  const getSongMatchDetails = useCallback((songId: string) => {
    return results.find(result => result.song.id === songId)
  }, [results])

  // Get highlighted text for a song
  const getHighlightedText = useCallback((songId: string, field: 'title' | 'artist' | 'tags') => {
    const result = results.find(r => r.song.id === songId)
    return result?.highlights[field] || ''
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
      
      // Match type insights
      if (stats.matchTypes.exact > 0) {
        insights.push(`${stats.matchTypes.exact} exact matches`)
      }
      if (stats.matchTypes.camelCase > 0) {
        insights.push(`${stats.matchTypes.camelCase} camelCase matches`)
      }
      if (stats.matchTypes.acronym > 0) {
        insights.push(`${stats.matchTypes.acronym} acronym matches`)
      }
    }
    
    return insights
  }, [getSearchStats])

  return {
    // State
    query,
    results,
    suggestions,
    loading,
    error,
    
    // Actions
    search,
    clearSearch,
    
    // Utilities
    getSearchStats,
    getTopResults,
    getResultsByScore,
    getResultsByMatchType,
    isSongMatch,
    getSongMatchDetails,
    getHighlightedText,
    getMatchQuality,
    getSearchInsights,
    
    // Computed
    hasResults: results.length > 0,
    isSearching: loading,
    isEmpty: query.length > 0 && results.length === 0 && !loading,
    isPerfectMatch: results.length > 0 && results[0].score >= 90,
    hasExactMatches: results.some(r => 
      Object.values(r.matches).some(m => m?.type === 'exact')
    ),
  }
}
