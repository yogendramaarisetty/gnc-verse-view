"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Song } from '@/lib/types'

interface UseInfiniteScrollOptions {
  language?: string
  pageSize?: number
  initialLoad?: number
}

export function useInfiniteScroll({
  language,
  pageSize = 20,
  initialLoad = 20
}: UseInfiniteScrollOptions) {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  
  const abortController = useRef<AbortController | null>(null)

  // Load songs with pagination
  const loadSongs = useCallback(async (page: number, reset = false) => {
    // Cancel previous request
    if (abortController.current) {
      abortController.current.abort()
    }
    
    abortController.current = new AbortController()
    
    // Calculate offset correctly - for page 0, offset is 0, for page 1, offset is initialLoad, etc.
    const offset = page === 0 ? 0 : (page - 1) * pageSize + initialLoad
    const limit = page === 0 ? initialLoad : pageSize
    
    setLoading(reset)
    setLoadingMore(!reset)
    setError(null)

    try {
      const response = await fetch(
        `/api/songs?language=${language || 'all'}&limit=${limit}&offset=${offset}`,
        { signal: abortController.current.signal }
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch songs')
      }

      const data = await response.json()
      const newSongs = data.songs || []

      if (reset) {
        setSongs(newSongs)
        setCurrentPage(1)
      } else {
        // Prevent duplicates by checking if songs already exist
        setSongs(prev => {
          const existingIds = new Set(prev.map(song => song.id))
          const uniqueNewSongs = newSongs.filter(song => !existingIds.has(song.id))
          return [...prev, ...uniqueNewSongs]
        })
        setCurrentPage(page + 1)
      }

      setTotalCount(data.totalCount || 0)
      setHasMore(newSongs.length === limit)

    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message)
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [language, pageSize, initialLoad])

  // Load more songs
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadSongs(currentPage)
    }
  }, [loadSongs, currentPage, loadingMore, hasMore])

  // Reset and load initial songs
  const reset = useCallback(() => {
    setSongs([])
    setCurrentPage(0)
    setHasMore(true)
    setError(null)
    loadSongs(0, true)
  }, [loadSongs])

  // Load initial songs when language changes
  useEffect(() => {
    reset()
  }, [language, reset])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort()
      }
    }
  }, [])

  return {
    songs,
    loading,
    loadingMore,
    error,
    hasMore,
    totalCount,
    loadMore,
    reset,
    currentPage,
    totalPages: Math.ceil(totalCount / pageSize),
  }
}
