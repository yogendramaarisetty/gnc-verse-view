"use client"

import { useState, useEffect } from "react"
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, useMediaQuery, useTheme, CircularProgress } from "@mui/material"
import MenuIcon from "@mui/icons-material/Menu"
import MenuBookIcon from "@mui/icons-material/MenuBook"
import { LanguageSidebar, type ViewMode } from "@/components/language-sidebar"
import { EnhancedSongList } from "@/components/enhanced-song-list"
import { SongViewer } from "@/components/song-viewer"
import { PresentationMode } from "@/components/presentation-mode"
import { PlaylistManager } from "@/components/playlist-manager"
import { SearchBar } from "@/components/search-bar"
import { LoginButton } from "@/components/auth/login-button"
import { UserMenu } from "@/components/auth/user-menu"
import { useAuth } from "@/lib/hooks/useAuth"
import { useSongs } from "@/lib/hooks/useSongs"
import { useFavorites } from "@/lib/hooks/useFavorites"
import { usePlaylists } from "@/lib/hooks/usePlaylists"
import { useHistory } from "@/lib/hooks/useHistory"
import type { Song, Playlist } from "@/lib/types"

const SIDEBAR_WIDTH = 280
const SONG_LIST_WIDTH = 380

export default function Home() {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState("Malayalam")
  const [viewMode, setViewMode] = useState<ViewMode>("all")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [presentationMode, setPresentationMode] = useState(false)
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null)

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"))

  // Auth and data hooks
  const { user, loading: authLoading } = useAuth()
  const { favorites, loading: favoritesLoading, toggleFavoriteStatus, checkIsFavorite } = useFavorites()
  const { playlists, loading: playlistsLoading, createPlaylist, addSongToPlaylist, removeSongFromPlaylist } = usePlaylists()
  const { history, loading: historyLoading, addToHistory } = useHistory()
  
  // Songs data based on view mode
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
    addToHistory(song.id)
    if (isMobile) {
      setMobileOpen(false)
    }
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    setSelectedPlaylist(null)
  }

  const handleSelectPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist)
    setViewMode("playlists")
  }

  const getPlaylistSongs = (): Song[] => {
    if (selectedPlaylist) {
      return selectedPlaylist.songs || []
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

  const sidebar = (
    <LanguageSidebar
      selectedLanguage={selectedLanguage}
      onLanguageChange={setSelectedLanguage}
      viewMode={viewMode}
      onViewModeChange={handleViewModeChange}
      songs={songs}
      favoritesCount={favorites.length}
      recentCount={history.length}
      playlistsCount={playlists.length}
      onSelectSong={handleSelectSong}
    />
  )

  const songList =
    viewMode === "playlists" && !selectedPlaylist ? (
      <PlaylistManager 
        songs={songs} 
        onSelectPlaylist={handleSelectPlaylist}
        onCreatePlaylist={createPlaylist}
        playlists={playlists}
      />
    ) : (
      <EnhancedSongList
        songs={selectedPlaylist ? getPlaylistSongs() : songs}
        onSelectSong={handleSelectSong}
        selectedSongId={selectedSong?.id}
        selectedLanguage={selectedLanguage}
        viewMode={viewMode}
      />
    )

  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "rgb(10, 10, 10)" }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          bgcolor: "rgb(20, 20, 20)",
          borderBottom: "1px solid rgb(38, 38, 38)",
          boxShadow: "none",
        }}
      >
        <Toolbar variant="dense" sx={{ minHeight: "56px", gap: 2 }}>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 1, color: "rgb(250, 250, 250)" }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
            <MenuBookIcon sx={{ color: "rgb(59, 130, 246)", fontSize: "1.5rem" }} />
            <Typography variant="h6" noWrap component="div" sx={{ color: "rgb(250, 250, 250)", fontWeight: 600 }}>
              GNC Worship Tool
            </Typography>
          </Box>
          <Box sx={{ flex: 1, display: "flex", justifyContent: "center", px: 2 }}>
            <SearchBar songs={songs} onSelectSong={handleSelectSong} />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {user ? (
              <UserMenu user={user} />
            ) : (
              <LoginButton />
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Left Sidebar - Language/Category Navigation */}
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
              },
            }}
          >
            {sidebar}
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
              },
            }}
            open
          >
            {sidebar}
          </Drawer>
        )}
      </Box>

      {/* Middle Panel - Song List */}
      {!isMobile && (
        <Box
          sx={{
            width: SONG_LIST_WIDTH,
            flexShrink: 0,
            borderRight: "1px solid rgb(38, 38, 38)",
            mt: "56px",
            height: "calc(100vh - 56px)",
          }}
        >
          {songList}
        </Box>
      )}

      {/* Main Content - Song Viewer */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { lg: `calc(100% - ${SIDEBAR_WIDTH + SONG_LIST_WIDTH}px)` },
          mt: "56px",
          height: "calc(100vh - 56px)",
        }}
      >
        {selectedSong ? (
          <SongViewer
            song={selectedSong}
            onPresentationMode={() => setPresentationMode(true)}
            onFavoritesChange={toggleFavoriteStatus}
            onPlaylistAdd={addSongToPlaylist}
            onPlaylistRemove={removeSongFromPlaylist}
            playlists={playlists}
            isFavorite={checkIsFavorite}
          />
        ) : (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              bgcolor: "rgb(20, 20, 20)",
            }}
          >
            <Typography variant="h6" sx={{ color: "rgb(163, 163, 163)" }}>
              Select a song to view
            </Typography>
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
