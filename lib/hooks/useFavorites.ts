"use client"

import { useState, useEffect, useCallback } from 'react'
import { getFavorites, addFavorite, removeFavorite, isFavorite, toggleFavorite } from '@/lib/api/favorites'
import { useAuth } from './useAuth'
import type { FavoriteSong } from '@/lib/api/favorites'

// localStorage keys for anonymous users
const ANONYMOUS_FAVORITES_KEY = 'gnc_anonymous_favorites'

export function useFavorites() {
  const { user, loading: authLoading } = useAuth()
  const [favorites, setFavorites] = useState<FavoriteSong[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load favorites from localStorage for anonymous users
  const loadAnonymousFavorites = useCallback(() => {
    try {
      const stored = localStorage.getItem(ANONYMOUS_FAVORITES_KEY)
      if (stored) {
        const favoriteIds = JSON.parse(stored)
        return favoriteIds
      }
    } catch (error) {
      console.error('Error loading anonymous favorites:', error)
    }
    return []
  }, [])

  // Save favorites to localStorage for anonymous users
  const saveAnonymousFavorites = useCallback((favoriteIds: string[]) => {
    try {
      localStorage.setItem(ANONYMOUS_FAVORITES_KEY, JSON.stringify(favoriteIds))
    } catch (error) {
      console.error('Error saving anonymous favorites:', error)
    }
  }, [])

  const loadFavorites = useCallback(async () => {
    if (!user) {
      // For anonymous users, load from localStorage
      const favoriteIds = loadAnonymousFavorites()
      // Convert IDs to FavoriteSong objects (simplified structure for anonymous users)
      const anonymousFavorites: FavoriteSong[] = favoriteIds.map(id => ({
        id,
        song_id: id,
        created_at: new Date().toISOString()
      }))
      setFavorites(anonymousFavorites)
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const data = await getFavorites()
      setFavorites(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load favorites')
    } finally {
      setLoading(false)
    }
  }, [user, loadAnonymousFavorites])

  useEffect(() => {
    if (!authLoading) {
      loadFavorites()
    }
  }, [authLoading, loadFavorites])

  const addToFavorites = useCallback(async (songId: string) => {
    if (!user) {
      // For anonymous users, use localStorage
      const favoriteIds = loadAnonymousFavorites()
      if (!favoriteIds.includes(songId)) {
        const newFavoriteIds = [...favoriteIds, songId]
        saveAnonymousFavorites(newFavoriteIds)
        setFavorites(prev => [...prev, { id: songId, song_id: songId, created_at: new Date().toISOString() }])
      }
      return
    }

    try {
      await addFavorite(songId)
      await loadFavorites() // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add favorite')
    }
  }, [user, loadFavorites, loadAnonymousFavorites, saveAnonymousFavorites])

  const removeFromFavorites = useCallback(async (songId: string) => {
    if (!user) {
      // For anonymous users, use localStorage
      const favoriteIds = loadAnonymousFavorites()
      const newFavoriteIds = favoriteIds.filter(id => id !== songId)
      saveAnonymousFavorites(newFavoriteIds)
      setFavorites(prev => prev.filter(fav => fav.song_id !== songId))
      return
    }

    try {
      await removeFavorite(songId)
      await loadFavorites() // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove favorite')
    }
  }, [user, loadFavorites, loadAnonymousFavorites, saveAnonymousFavorites])

  const toggleFavoriteStatus = useCallback(async (songId: string) => {
    if (!user) {
      // For anonymous users, use localStorage
      const favoriteIds = loadAnonymousFavorites()
      const isCurrentlyFavorite = favoriteIds.includes(songId)
      
      if (isCurrentlyFavorite) {
        const newFavoriteIds = favoriteIds.filter(id => id !== songId)
        saveAnonymousFavorites(newFavoriteIds)
        setFavorites(prev => prev.filter(fav => fav.song_id !== songId))
        return false
      } else {
        const newFavoriteIds = [...favoriteIds, songId]
        saveAnonymousFavorites(newFavoriteIds)
        setFavorites(prev => [...prev, { id: songId, song_id: songId, created_at: new Date().toISOString() }])
        return true
      }
    }

    try {
      const isFav = await toggleFavorite(songId)
      await loadFavorites() // Refresh the list
      return isFav
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle favorite')
      return false
    }
  }, [user, loadFavorites, loadAnonymousFavorites, saveAnonymousFavorites])

  const checkIsFavorite = useCallback(async (songId: string) => {
    if (!user) {
      const favoriteIds = loadAnonymousFavorites()
      return favoriteIds.includes(songId)
    }

    try {
      return await isFavorite(songId)
    } catch (err) {
      console.error('Failed to check favorite status:', err)
      return false
    }
  }, [user, loadAnonymousFavorites])

  return {
    favorites,
    loading,
    error,
    addToFavorites,
    removeFromFavorites,
    toggleFavoriteStatus,
    checkIsFavorite,
    refresh: loadFavorites,
  }
}
