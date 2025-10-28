"use client"

import { useState, useEffect, useCallback } from 'react'
import { 
  getPlaylists, 
  createPlaylist, 
  updatePlaylist, 
  deletePlaylist, 
  addSongToPlaylist, 
  removeSongFromPlaylist 
} from '@/lib/api/playlists'
import { useAuth } from './useAuth'
import type { PlaylistWithSongs } from '@/lib/api/playlists'

// localStorage keys for anonymous users
const ANONYMOUS_PLAYLISTS_KEY = 'gnc_anonymous_playlists'

export function usePlaylists() {
  const { user, loading: authLoading } = useAuth()
  const [playlists, setPlaylists] = useState<PlaylistWithSongs[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load playlists from localStorage for anonymous users
  const loadAnonymousPlaylists = useCallback(() => {
    try {
      const stored = localStorage.getItem(ANONYMOUS_PLAYLISTS_KEY)
      if (stored) {
        const playlists = JSON.parse(stored)
        return playlists
      }
    } catch (error) {
      console.error('Error loading anonymous playlists:', error)
    }
    return []
  }, [])

  // Save playlists to localStorage for anonymous users
  const saveAnonymousPlaylists = useCallback((playlists: PlaylistWithSongs[]) => {
    try {
      localStorage.setItem(ANONYMOUS_PLAYLISTS_KEY, JSON.stringify(playlists))
    } catch (error) {
      console.error('Error saving anonymous playlists:', error)
    }
  }, [])

  const loadPlaylists = useCallback(async () => {
    if (!user) {
      // For anonymous users, load from localStorage
      const anonymousPlaylists = loadAnonymousPlaylists()
      setPlaylists(anonymousPlaylists)
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const data = await getPlaylists()
      setPlaylists(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load playlists')
    } finally {
      setLoading(false)
    }
  }, [user, loadAnonymousPlaylists])

  useEffect(() => {
    if (!authLoading) {
      loadPlaylists()
    }
  }, [authLoading, loadPlaylists])

  const createNewPlaylist = useCallback(async (name: string, description: string = '') => {
    if (!user) {
      // For anonymous users, create in localStorage
      const newPlaylist: PlaylistWithSongs = {
        id: `anonymous_${Date.now()}`,
        name,
        description,
        share_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        songs: []
      }
      const currentPlaylists = loadAnonymousPlaylists()
      const updatedPlaylists = [newPlaylist, ...currentPlaylists]
      saveAnonymousPlaylists(updatedPlaylists)
      setPlaylists(updatedPlaylists)
      return newPlaylist
    }

    try {
      const newPlaylist = await createPlaylist(name, description)
      setPlaylists(prev => [newPlaylist, ...prev])
      return newPlaylist
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create playlist')
      throw err
    }
  }, [user, loadAnonymousPlaylists, saveAnonymousPlaylists])

  const updateExistingPlaylist = useCallback(async (playlistId: string, updates: { name?: string; description?: string }) => {
    if (!user) {
      // For anonymous users, update in localStorage
      const currentPlaylists = loadAnonymousPlaylists()
      const updatedPlaylists = currentPlaylists.map(p => 
        p.id === playlistId 
          ? { ...p, ...updates, updated_at: new Date().toISOString() }
          : p
      )
      saveAnonymousPlaylists(updatedPlaylists)
      setPlaylists(updatedPlaylists)
      return updatedPlaylists.find(p => p.id === playlistId)!
    }

    try {
      const updatedPlaylist = await updatePlaylist(playlistId, updates)
      setPlaylists(prev => 
        prev.map(p => p.id === playlistId ? { ...p, ...updatedPlaylist } : p)
      )
      return updatedPlaylist
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update playlist')
      throw err
    }
  }, [user, loadAnonymousPlaylists, saveAnonymousPlaylists])

  const deleteExistingPlaylist = useCallback(async (playlistId: string) => {
    if (!user) {
      // For anonymous users, delete from localStorage
      const currentPlaylists = loadAnonymousPlaylists()
      const updatedPlaylists = currentPlaylists.filter(p => p.id !== playlistId)
      saveAnonymousPlaylists(updatedPlaylists)
      setPlaylists(updatedPlaylists)
      return
    }

    try {
      await deletePlaylist(playlistId)
      setPlaylists(prev => prev.filter(p => p.id !== playlistId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete playlist')
      throw err
    }
  }, [user, loadAnonymousPlaylists, saveAnonymousPlaylists])

  const addSong = useCallback(async (playlistId: string, songId: string) => {
    if (!user) {
      // For anonymous users, add to localStorage
      const currentPlaylists = loadAnonymousPlaylists()
      const updatedPlaylists = currentPlaylists.map(p => {
        if (p.id === playlistId) {
          // Check if song is already in playlist
          const songExists = p.songs.some(s => s.id === songId)
          if (!songExists) {
            // Add song to playlist (we need the full song object, but for now just add the ID)
            // The parent component should provide the full song object
            return {
              ...p,
              songs: [...p.songs, { id: songId } as any], // Simplified for anonymous users
              updated_at: new Date().toISOString()
            }
          }
        }
        return p
      })
      saveAnonymousPlaylists(updatedPlaylists)
      setPlaylists(updatedPlaylists)
      return
    }

    try {
      await addSongToPlaylist(playlistId, songId)
      await loadPlaylists() // Refresh to get updated song list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add song to playlist')
      throw err
    }
  }, [user, loadPlaylists, loadAnonymousPlaylists, saveAnonymousPlaylists])

  const removeSong = useCallback(async (playlistId: string, songId: string) => {
    if (!user) {
      // For anonymous users, remove from localStorage
      const currentPlaylists = loadAnonymousPlaylists()
      const updatedPlaylists = currentPlaylists.map(p => {
        if (p.id === playlistId) {
          return {
            ...p,
            songs: p.songs.filter(s => s.id !== songId),
            updated_at: new Date().toISOString()
          }
        }
        return p
      })
      saveAnonymousPlaylists(updatedPlaylists)
      setPlaylists(updatedPlaylists)
      return
    }

    try {
      await removeSongFromPlaylist(playlistId, songId)
      await loadPlaylists() // Refresh to get updated song list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove song from playlist')
      throw err
    }
  }, [user, loadPlaylists, loadAnonymousPlaylists, saveAnonymousPlaylists])

  return {
    playlists,
    loading,
    error,
    createPlaylist: createNewPlaylist,
    updatePlaylist: updateExistingPlaylist,
    deletePlaylist: deleteExistingPlaylist,
    addSongToPlaylist: addSong,
    removeSongFromPlaylist: removeSong,
    refresh: loadPlaylists,
  }
}
