"use client"

import { useState, useEffect } from "react"
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, useMediaQuery, useTheme, CircularProgress } from "@mui/material"
import MenuIcon from "@mui/icons-material/Menu"
import MenuBookIcon from "@mui/icons-material/MenuBook"
import ListIcon from "@mui/icons-material/List"
import { UnifiedSidebar } from "@/components/unified-sidebar"
import { SongViewer } from "@/components/song-viewer"
import { PresentationMode } from "@/components/presentation-mode"
import type { ViewMode } from "@/components/language-sidebar"
import { SearchBar } from "@/components/search-bar"
import { LoginButton } from "@/components/auth/login-button"
import { UserMenu } from "@/components/auth/user-menu"
import { useAuth } from "@/lib/hooks/useAuth"
import { useSongs, useAllSongs } from "@/lib/hooks/useSongs"
import { useFavorites } from "@/lib/hooks/useFavorites"
import { usePlaylists } from "@/lib/hooks/usePlaylists"
import { useHistory } from "@/lib/hooks/useHistory"
import type { Song, Playlist } from "@/lib/types"

const SIDEBAR_WIDTH = 400

export default function Home() {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState("Malayalam")
  const [viewMode, setViewMode] = useState<ViewMode>("all")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [presentationMode, setPresentationMode] = useState(false)
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null)
  const [sidebarView, setSidebarView] = useState<'navigation' | 'songList'>('navigation')

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"))

  // Auth and data hooks
  const { user, loading: authLoading } = useAuth()
  const { favorites, loading: favoritesLoading, toggleFavoriteStatus, checkIsFavorite } = useFavorites()
  const { playlists, loading: playlistsLoading, createPlaylist, addSongToPlaylist, removeSongFromPlaylist } = usePlaylists()
  const { history, loading: historyLoading, addToHistory } = useHistory()

  // Wrapper functions to handle async operations
  const handleToggleFavorite = async (songId: string) => {
    try {
      await toggleFavoriteStatus(songId)
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  const handleToggleFavoriteNoArgs = async () => {
    // This will be called from components that don't have songId context
    console.warn('handleToggleFavoriteNoArgs called without songId')
  }

  const handleCheckIsFavorite = (songId: string) => {
    // This is async but we'll handle it in the component
    return checkIsFavorite(songId)
  }

  const handleCheckIsFavoriteSync = (songId: string) => {
    // For now, return false as a placeholder
    // The actual async check will be handled in the component
    return false
  }

  const handleAddToPlaylist = async (playlistId: string, songId: string) => {
    try {
      await addSongToPlaylist(playlistId, songId)
    } catch (error) {
      console.error('Failed to add song to playlist:', error)
    }
  }

  const handleAddToPlaylistSingleArg = async (playlistId: string) => {
    // This will be called from components that don't have songId context
    console.warn('handleAddToPlaylistSingleArg called without songId')
  }

  const handleRemoveFromPlaylist = async (playlistId: string, songId: string) => {
    try {
      await removeSongFromPlaylist(playlistId, songId)
    } catch (error) {
      console.error('Failed to remove song from playlist:', error)
    }
  }

  const handleRemoveFromPlaylistSingleArg = async (playlistId: string) => {
    // This will be called from components that don't have songId context
    console.warn('handleRemoveFromPlaylistSingleArg called without songId')
  }
  
  // All songs for navbar search (across all languages)
  const { songs: allSongs, loading: allSongsLoading, error: allSongsError } = useAllSongs()
  
  // Songs data based on view mode (for sidebar)
  const songsOptions = {
    language: viewMode === "all" ? selectedLanguage : undefined,
    trending: viewMode === "trending",
    limit: 50,
  }
  const { songs, loading: songsLoading, error: songsError } = useSongs(songsOptions)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleSelectSong = (song: Song) => {
    setSelectedSong(song)
    // Track view in history for both authenticated and anonymous users
    if (song?.id && typeof song.id === 'string') {
      try {
        addToHistory(song.id)
      } catch (error) {
        console.error('Failed to add song to history:', error)
        // Don't prevent song selection from working
      }
    } else {
      console.error('Invalid song object passed to handleSelectSong:', song)
    }
    if (isMobile) {
      setMobileOpen(false)
    }
  }

  const handleShowSongList = () => {
    setSidebarView('songList')
  }

  const handleShowNavigation = () => {
    setSidebarView('navigation')
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    setSelectedPlaylist(null)
    setSidebarView('songList')
  }

  const handleSelectPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist)
    setViewMode("playlists")
  }

  const getPlaylistSongs = (): Song[] => {
    if (selectedPlaylist) {
      // Find songs that match the playlist's song IDs
      return allSongs.filter(song => 
        selectedPlaylist.songIds?.includes(song.id)
      )
    }
    return []
  }

  // Show loading state
  if (authLoading || songsLoading) {
    return (
      <Box sx={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        bgcolor: "rgb(10, 10, 10)"
      }}>
        <CircularProgress sx={{ color: "rgb(59, 130, 246)" }} />
      </Box>
    )
  }


  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "rgb(10, 10, 10)" }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          bgcolor: "rgb(20, 20, 20)",
          borderBottom: "1px solid rgb(38, 38, 38)",
          boxShadow: "none",
          overflow: "visible",
        }}
      >
        <Toolbar 
          variant="dense" 
          sx={{ 
            minHeight: "56px", 
            gap: { xs: 1, sm: 2 },
            px: { xs: 1, sm: 2 },
            overflow: "visible"
          }}
        >
          {isMobile ? (
            // Mobile: Just burger menu and search bar
            <>
              <IconButton
                color="inherit"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ 
                  mr: 1, 
                  color: "rgb(250, 250, 250)",
                  flexShrink: 0
                }}
              >
                <MenuIcon />
              </IconButton>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <SearchBar songs={allSongs} onSelectSong={handleSelectSong} history={history} />
              </Box>
            </>
          ) : (
            // Desktop: Full toolbar
            <>
              <Box sx={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 1.5, 
                flexShrink: 0,
                minWidth: 0
              }}>
                <MenuBookIcon sx={{ color: "rgb(59, 130, 246)", fontSize: "1.5rem" }} />
                <Typography 
                  variant="h6" 
                  noWrap 
                  component="div" 
                  sx={{ 
                    color: "rgb(250, 250, 250)", 
                    fontWeight: 600
                  }}
                >
                  GNC Worship Tool
                </Typography>
              </Box>
              <Box sx={{ 
                flex: 1, 
                display: "flex", 
                justifyContent: "center", 
                px: 2,
                minWidth: 0
              }}>
                <SearchBar songs={allSongs} onSelectSong={handleSelectSong} history={history} />
              </Box>
              <Box sx={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 1,
                flexShrink: 0
              }}>
                {user ? (
                  <UserMenu user={{
                    id: user.id,
                    email: user.email || '',
                    user_metadata: user.user_metadata
                  }} />
                ) : (
                  <LoginButton />
                )}
              </Box>
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* Unified Sidebar - Navigation and Song List */}
      <Box
        component="nav"
        sx={{
          width: { lg: SIDEBAR_WIDTH },
          flexShrink: { lg: 0 },
        }}
      >
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true,
            }}
            sx={{
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                width: SIDEBAR_WIDTH,
                bgcolor: "rgb(20, 20, 20)",
                borderRight: "1px solid rgb(38, 38, 38)",
                mt: "56px",
                height: "calc(100vh - 56px)",
              },
            }}
          >
            <UnifiedSidebar
              viewMode={viewMode}
              selectedLanguage={selectedLanguage}
              selectedPlaylist={selectedPlaylist}
              songs={allSongs}
              filteredSongs={songs}
              playlists={playlists}
              history={history}
              loading={allSongsLoading}
              error={allSongsError}
              onViewModeChange={handleViewModeChange}
              onLanguageChange={setSelectedLanguage}
              onSelectSong={handleSelectSong}
              onSelectPlaylist={handleSelectPlaylist}
              onCreatePlaylist={createPlaylist}
              onFavoritesChange={handleToggleFavoriteNoArgs}
              onPlaylistAdd={handleAddToPlaylist}
              onPlaylistRemove={handleRemoveFromPlaylist}
              checkIsFavorite={handleCheckIsFavoriteSync}
              sidebarView={sidebarView}
              onShowNavigation={handleShowNavigation}
              onShowSongList={handleShowSongList}
            />
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                width: SIDEBAR_WIDTH,
                bgcolor: "rgb(20, 20, 20)",
                borderRight: "1px solid rgb(38, 38, 38)",
                mt: "56px",
                height: "calc(100vh - 56px)",
              },
            }}
            open
          >
            <UnifiedSidebar
              viewMode={viewMode}
              selectedLanguage={selectedLanguage}
              selectedPlaylist={selectedPlaylist}
              songs={allSongs}
              filteredSongs={songs}
              playlists={playlists}
              history={history}
              loading={allSongsLoading}
              error={allSongsError}
              onViewModeChange={handleViewModeChange}
              onLanguageChange={setSelectedLanguage}
              onSelectSong={handleSelectSong}
              onSelectPlaylist={handleSelectPlaylist}
              onCreatePlaylist={createPlaylist}
              onFavoritesChange={handleToggleFavoriteNoArgs}
              onPlaylistAdd={handleAddToPlaylist}
              onPlaylistRemove={handleRemoveFromPlaylist}
              checkIsFavorite={handleCheckIsFavoriteSync}
              sidebarView={sidebarView}
              onShowNavigation={handleShowNavigation}
              onShowSongList={handleShowSongList}
            />
          </Drawer>
        )}
      </Box>


      {/* Main Content - Song Viewer */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { 
            xs: "100%", 
            lg: `calc(100% - ${SIDEBAR_WIDTH}px)` 
          },
          mt: "56px",
          height: "calc(100vh - 56px)",
        }}
      >
        {selectedSong ? (
          <SongViewer
            song={selectedSong}
            onPresentationMode={() => setPresentationMode(true)}
            onFavoritesChange={handleToggleFavoriteNoArgs}
            onPlaylistAdd={handleAddToPlaylistSingleArg}
            onPlaylistRemove={handleRemoveFromPlaylistSingleArg}
            playlists={playlists}
            isFavorite={false}
          />
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              bgcolor: "rgb(20, 20, 20)",
              px: 2,
              textAlign: "center",
            }}
          >
            <Typography variant="h6" sx={{ color: "rgb(163, 163, 163)", mb: 1 }}>
              Select a song to view
            </Typography>
            {isMobile && (
              <Typography variant="body2" sx={{ color: "rgb(100, 100, 100)", maxWidth: 300 }}>
                Tap the list icon in the top bar to browse songs, or use the search bar to find a specific song.
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Presentation Mode */}
      {presentationMode && selectedSong && (
        <PresentationMode song={selectedSong} onClose={() => setPresentationMode(false)} />
      )}
    </Box>
  )
}
