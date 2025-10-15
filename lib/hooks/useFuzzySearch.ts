"use client"

import { useState, useCallback, useMemo, useRef } from 'react'
import { fuzzySearchSongs, getSearchSuggestions, type SearchResult } from '@/lib/utils/fuzzy-search'
import type { Song } from '@/lib/types'

interface UseFuzzySearchOptions {
  songs: Song[]
  language?: string
  debounceMs?: number
  minQueryLength?: number
}

export function useFuzzySearch({
  songs,
  language,
  debounceMs = 300,
  minQueryLength = 1
}: UseFuzzySearchOptions) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const searchCache = useRef<Map<string, SearchResult[]>>(new Map())
  const suggestionsCache = useRef<Map<string, string[]>>(new Map())

  // Memoized filtered songs for current language
  const filteredSongs = useMemo(() => {
    if (!language) return songs
    return songs.filter(song => song.language === language)
  }, [songs, language])

  // Perform fuzzy search
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
      // Perform fuzzy search
      const searchResults = fuzzySearchSongs(filteredSongs, searchQuery, language)
      
      // Cache results
      searchCache.current.set(cacheKey, searchResults)
      
      // Limit cache size
      if (searchCache.current.size > 50) {
        const firstKey = searchCache.current.keys().next().value
        searchCache.current.delete(firstKey)
      }
      
      setResults(searchResults)
      
      // Get suggestions for autocomplete
      const searchSuggestions = getSearchSuggestions(filteredSongs, searchQuery, 5)
      setSuggestions(searchSuggestions)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [filteredSongs, language, minQueryLength])

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
        : 0
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

  // Check if query matches a specific song
  const isSongMatch = useCallback((songId: string) => {
    return results.some(result => result.song.id === songId)
  }, [results])

  // Get match details for a specific song
  const getSongMatchDetails = useCallback((songId: string) => {
    return results.find(result => result.song.id === songId)
  }, [results])

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
    isSongMatch,
    getSongMatchDetails,
    
    // Computed
    hasResults: results.length > 0,
    isSearching: loading,
    isEmpty: query.length > 0 && results.length === 0 && !loading,
  }
}
