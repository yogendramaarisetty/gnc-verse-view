import type { Playlist } from "./types"

const STORAGE_KEYS = {
  FAVORITES: "verseview_favorites",
  FONT_SIZE: "verseview_font_size",
  RECENTLY_VIEWED: "verseview_recently_viewed",
  PLAYLISTS: "verseview_playlists",
}

export const storage = {
  getFavorites: (): string[] => {
    if (typeof window === "undefined") return []
    const favorites = localStorage.getItem(STORAGE_KEYS.FAVORITES)
    return favorites ? JSON.parse(favorites) : []
  },

  setFavorites: (favorites: string[]): void => {
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites))
  },

  toggleFavorite: (songId: string): boolean => {
    const favorites = storage.getFavorites()
    const index = favorites.indexOf(songId)

    if (index > -1) {
      favorites.splice(index, 1)
      storage.setFavorites(favorites)
      return false
    } else {
      favorites.push(songId)
      storage.setFavorites(favorites)
      return true
    }
  },

  isFavorite: (songId: string): boolean => {
    return storage.getFavorites().includes(songId)
  },

  getFontSize: (): number => {
    if (typeof window === "undefined") return 16
    const fontSize = localStorage.getItem(STORAGE_KEYS.FONT_SIZE)
    return fontSize ? Number.parseInt(fontSize) : 16
  },

  setFontSize: (size: number): void => {
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEYS.FONT_SIZE, size.toString())
  },

  getRecentlyViewed: (): string[] => {
    if (typeof window === "undefined") return []
    const recent = localStorage.getItem(STORAGE_KEYS.RECENTLY_VIEWED)
    return recent ? JSON.parse(recent) : []
  },

  addRecentlyViewed: (songId: string): void => {
    if (typeof window === "undefined") return
    let recent = storage.getRecentlyViewed()
    recent = recent.filter((id) => id !== songId)
    recent.unshift(songId)
    recent = recent.slice(0, 20) // Keep only last 20
    localStorage.setItem(STORAGE_KEYS.RECENTLY_VIEWED, JSON.stringify(recent))
  },

  getPlaylists: (): Playlist[] => {
    if (typeof window === "undefined") return []
    const playlists = localStorage.getItem(STORAGE_KEYS.PLAYLISTS)
    return playlists ? JSON.parse(playlists) : []
  },

  savePlaylists: (playlists: Playlist[]): void => {
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists))
  },

  createPlaylist: (name: string, description: string): Playlist => {
    const playlist: Playlist = {
      id: Date.now().toString(),
      name,
      description,
      songIds: [],
      createdAt: new Date().toISOString(),
      shareCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
    }
    const playlists = storage.getPlaylists()
    playlists.push(playlist)
    storage.savePlaylists(playlists)
    return playlist
  },

  updatePlaylist: (playlistId: string, updates: Partial<Playlist>): void => {
    const playlists = storage.getPlaylists()
    const index = playlists.findIndex((p) => p.id === playlistId)
    if (index > -1) {
      playlists[index] = { ...playlists[index], ...updates }
      storage.savePlaylists(playlists)
    }
  },

  deletePlaylist: (playlistId: string): void => {
    const playlists = storage.getPlaylists().filter((p) => p.id !== playlistId)
    storage.savePlaylists(playlists)
  },

  addSongToPlaylist: (playlistId: string, songId: string): void => {
    const playlists = storage.getPlaylists()
    const playlist = playlists.find((p) => p.id === playlistId)
    if (playlist && !playlist.songIds.includes(songId)) {
      playlist.songIds.push(songId)
      storage.savePlaylists(playlists)
    }
  },

  removeSongFromPlaylist: (playlistId: string, songId: string): void => {
    const playlists = storage.getPlaylists()
    const playlist = playlists.find((p) => p.id === playlistId)
    if (playlist) {
      playlist.songIds = playlist.songIds.filter((id) => id !== songId)
      storage.savePlaylists(playlists)
    }
  },
}
