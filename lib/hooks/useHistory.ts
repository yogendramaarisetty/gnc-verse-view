"use client"

import { useState, useEffect, useCallback } from 'react'
import { getHistory, addToHistory, clearHistory, getGuestHistory } from '@/lib/api/history'
import { useAuth } from './useAuth'
import type { HistorySong } from '@/lib/api/history'

// localStorage keys for anonymous users
const ANONYMOUS_HISTORY_KEY = 'gnc_anonymous_history'

export function useHistory() {
  const { user, loading: authLoading } = useAuth()
  const [history, setHistory] = useState<HistorySong[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load history from localStorage for anonymous users
  const loadAnonymousHistory = useCallback(() => {
    try {
      const stored = localStorage.getItem(ANONYMOUS_HISTORY_KEY)
      if (stored) {
        const historyIds = JSON.parse(stored)
        return historyIds
      }
    } catch (error) {
      console.error('Error loading anonymous history:', error)
    }
    return []
  }, [])

  // Save history to localStorage for anonymous users
  const saveAnonymousHistory = useCallback((historyIds: string[]) => {
    try {
      localStorage.setItem(ANONYMOUS_HISTORY_KEY, JSON.stringify(historyIds))
    } catch (error) {
      console.error('Error saving anonymous history:', error)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    if (!user) {
      // For anonymous users, load from localStorage
      const historyIds = loadAnonymousHistory()
      // Convert IDs to HistorySong objects (simplified structure for anonymous users)
      const anonymousHistory: HistorySong[] = historyIds.map(id => ({
        id,
        song_id: id,
        viewed_at: new Date().toISOString()
      }))
      setHistory(anonymousHistory)
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const data = await getHistory()
      setHistory(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }, [user, loadAnonymousHistory])

  useEffect(() => {
    if (!authLoading) {
      loadHistory()
    }
  }, [authLoading, loadHistory])

  const addToHistoryList = useCallback(async (songId: string) => {
    if (!user) {
      // For anonymous users, use localStorage
      const currentHistory = loadAnonymousHistory()
      // Remove if already exists (to move to top)
      const filteredHistory = currentHistory.filter(id => id !== songId)
      // Add to beginning and limit to 20 items
      const newHistory = [songId, ...filteredHistory].slice(0, 20)
      saveAnonymousHistory(newHistory)
      
      // Update local state
      const updatedHistory: HistorySong[] = newHistory.map(id => ({
        id,
        song_id: id,
        viewed_at: new Date().toISOString()
      }))
      setHistory(updatedHistory)
      return
    }

    try {
      await addToHistory(songId)
      await loadHistory() // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to history')
    }
  }, [user, loadHistory, loadAnonymousHistory, saveAnonymousHistory])

  const clearHistoryList = useCallback(async () => {
    if (!user) {
      // For anonymous users, clear localStorage
      saveAnonymousHistory([])
      setHistory([])
      return
    }

    try {
      await clearHistory()
      setHistory([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear history')
    }
  }, [user, saveAnonymousHistory])

  return {
    history,
    loading,
    error,
    addToHistory: addToHistoryList,
    clearHistory: clearHistoryList,
    refresh: loadHistory,
  }
}

export function useGuestHistory() {
  const [guestHistory, setGuestHistory] = useState<string[]>([])

  const loadGuestHistory = useCallback(async () => {
    try {
      const data = await getGuestHistory()
      setGuestHistory(data)
    } catch (err) {
      console.error('Failed to load guest history:', err)
    }
  }, [])

  useEffect(() => {
    loadGuestHistory()
  }, [loadGuestHistory])

  const addToGuestHistory = useCallback((songId: string) => {
    try {
      const currentHistory = JSON.parse(localStorage.getItem('guest_history') || '[]')
      const updatedHistory = currentHistory.filter((id: string) => id !== songId)
      updatedHistory.unshift(songId)
      updatedHistory.splice(20) // Keep only last 20
      localStorage.setItem('guest_history', JSON.stringify(updatedHistory))
      setGuestHistory(updatedHistory)
    } catch (err) {
      console.error('Failed to add to guest history:', err)
    }
  }, [])

  const clearGuestHistory = useCallback(() => {
    try {
      localStorage.removeItem('guest_history')
      setGuestHistory([])
    } catch (err) {
      console.error('Failed to clear guest history:', err)
    }
  }, [])

  return {
    guestHistory,
    addToGuestHistory,
    clearGuestHistory,
    refresh: loadGuestHistory,
  }
}
