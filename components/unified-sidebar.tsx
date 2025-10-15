"use client"

import { Box, Typography, CircularProgress } from "@mui/material"
import { LanguageSidebar, type ViewMode } from "@/components/language-sidebar"
import { EnhancedSongList } from "@/components/enhanced-song-list"
import { PlaylistManager } from "@/components/playlist-manager"
import { Breadcrumb } from "@/components/breadcrumb"
import type { Song, Playlist } from "@/lib/types"
import type { HistorySong } from "@/lib/api/history"

interface UnifiedSidebarProps {
  viewMode: ViewMode
  selectedLanguage: string
  selectedPlaylist: Playlist | null
  songs: Song[] // All songs for navigation/counts
  filteredSongs: Song[] // Filtered songs for song list view
  playlists: Playlist[]
  history: HistorySong[] // History data for recently viewed
  loading: boolean
  error: string | null
  onViewModeChange: (mode: ViewMode) => void
  onLanguageChange: (language: string) => void
  onSelectSong: (song: Song) => void
  onSelectPlaylist: (playlist: Playlist) => void
  onCreatePlaylist: (name: string, description?: string) => void
  onFavoritesChange: () => void
  onPlaylistAdd: (playlistId: string, songId: string) => void
  onPlaylistRemove: (playlistId: string, songId: string) => void
  checkIsFavorite: (songId: string) => boolean
  sidebarView: 'navigation' | 'songList'
  onShowNavigation: () => void
  onShowSongList: () => void
}

export function UnifiedSidebar({
  viewMode,
  selectedLanguage,
  selectedPlaylist,
  songs,
  filteredSongs,
  playlists,
  history,
  loading,
  error,
  onViewModeChange,
  onLanguageChange,
  onSelectSong,
  onSelectPlaylist,
  onCreatePlaylist,
  onFavoritesChange,
  onPlaylistAdd,
  onPlaylistRemove,
  checkIsFavorite,
  sidebarView,
  onShowNavigation,
  onShowSongList
}: UnifiedSidebarProps) {
  const getPlaylistSongs = () => {
    if (!selectedPlaylist) return []
    return songs.filter(song => 
      selectedPlaylist.songIds?.includes(song.id)
    )
  }

  const songList = viewMode === "playlists" && !selectedPlaylist ? (
    <PlaylistManager 
      songs={songs} 
      onSelectPlaylist={onSelectPlaylist}
      onCreatePlaylist={onCreatePlaylist}
      playlists={playlists}
    />
  ) : (
    <EnhancedSongList
      songs={selectedPlaylist ? getPlaylistSongs() : filteredSongs}
      onSelectSong={onSelectSong}
      selectedSongId={undefined}
      selectedLanguage={selectedLanguage}
      viewMode={viewMode}
      history={history}
    />
  )

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {sidebarView === 'navigation' ? (
        loading ? (
          <Box sx={{ 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            height: "200px" 
          }}>
            <CircularProgress size={40} />
          </Box>
        ) : (
          <LanguageSidebar
            selectedLanguage={selectedLanguage}
            onLanguageChange={onLanguageChange}
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            songs={songs || []}
            history={history}
            favoritesCount={0}
            recentCount={history.length}
            playlistsCount={playlists.length}
            onSelectSong={onSelectSong}
          />
        )
      ) : (
        <>
          <Breadcrumb
            viewMode={viewMode}
            selectedLanguage={selectedLanguage}
            selectedPlaylist={selectedPlaylist?.name}
            onBack={onShowNavigation}
            onHome={onShowNavigation}
          />
          <Box sx={{ flex: 1, overflow: "auto" }}>
            {loading ? (
              <Box sx={{ 
                display: "flex", 
                justifyContent: "center", 
                alignItems: "center", 
                height: "200px" 
              }}>
                <CircularProgress size={40} />
              </Box>
            ) : error ? (
              <Box sx={{ p: 2, textAlign: "center" }}>
                <Typography color="error">{error}</Typography>
              </Box>
            ) : (
              songList
            )}
          </Box>
        </>
      )}
    </Box>
  )
}
