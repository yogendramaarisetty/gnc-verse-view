"use client"

import { useState, useEffect } from "react"
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, useMediaQuery, useTheme, CircularProgress, Stack } from "@mui/material"
import MenuIcon from "@mui/icons-material/Menu"
import MenuBookIcon from "@mui/icons-material/MenuBook"
import ListIcon from "@mui/icons-material/List"
import { UnifiedSidebar } from "@/components/unified-sidebar"
import { FilterSidebar } from "@/components/filter-sidebar"
import { SongViewer } from "@/components/song-viewer"
import { PresentationMode } from "@/components/presentation-mode"
import type { ViewMode } from "@/components/language-sidebar"
import type { FilterMode } from "@/components/filter-sidebar"
import { SearchBar } from "@/components/search-bar"
import { LanguageDropdown } from "@/components/language-dropdown"
import { InfiniteSongList } from "@/components/infinite-song-list"
import { LoginButton } from "@/components/auth/login-button"
import { UserMenu } from "@/components/auth/user-menu"
import { useAuth } from "@/lib/hooks/useAuth"
import { useSongs, useCacheInitialization, useLazySongList, useLanguageCounts, useInfiniteSongs } from "@/lib/hooks/useSongs"
import { useFavorites } from "@/lib/hooks/useFavorites"
import { usePlaylists } from "@/lib/hooks/usePlaylists"
import { useHistory } from "@/lib/hooks/useHistory"
import type { Song, Playlist } from "@/lib/types"

const SIDEBAR_WIDTH = 400

export default function Home() {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState("Telugu")
  const [viewMode, setViewMode] = useState<ViewMode>("all-songs")
  const [filterMode, setFilterMode] = useState<FilterMode>("all")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [presentationMode, setPresentationMode] = useState(false)
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null)
  const [sidebarView, setSidebarView] = useState<'navigation' | 'songList'>('songList')

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"))

  // Auth and data hooks
  const { user, loading: authLoading } = useAuth()
  const { favorites, loading: favoritesLoading, toggleFavoriteStatus, checkIsFavorite } = useFavorites()
  const { playlists, loading: playlistsLoading, createPlaylist, addSongToPlaylist, removeSongFromPlaylist } = usePlaylists()
  
  // Initialize cache
  const { isInitialized, isInitializing, cacheStats } = useCacheInitialization()
  const { history, loading: historyLoading, addToHistory } = useHistory()
  
  // Lazy loading for song lists
  const { 
    songs: lazySongs, 
    loading: lazyLoading, 
    error: lazyError, 
    loadSongs: loadLazySongs, 
    loadFullSong, 
    isSongFullyLoaded, 
    isSongLoading 
  } = useLazySongList()

  // Language counts
  const { languageCounts, totalCount, loading: countsLoading } = useLanguageCounts()

  // Infinite scroll for all songs
  const { 
    songs: allSongs, 
    loading: allSongsLoading, 
    error: allSongsError, 
    hasMore, 
    loadMore, 
    reset: resetAllSongs 
  } = useInfiniteSongs()

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

  const handleSelectSong = async (song: Song) => {
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
    
    // Load full song data if not already loaded
    if (!isSongFullyLoaded(song.id)) {
      const fullSong = await loadFullSong(song.id)
      if (fullSong) {
        setSelectedSong(fullSong)
      }
    }
  }

  const handleShowSongList = () => {
    setSidebarView('songList')
  }

  const handleShowAllSongs = () => {
    setViewMode('all-songs')
    setSidebarView('songList')
  }

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language)
    setViewMode('all-songs') // Set all-songs as default
    setFilterMode('all') // Reset filter to all
    setSidebarView('songList') // Show song list view
    // Reset all songs when language changes
    resetAllSongs(language)
  }

  const handleFilterModeChange = (mode: FilterMode) => {
    setFilterMode(mode)
    // Map filter modes to view modes
    const viewModeMap: Record<FilterMode, ViewMode> = {
      'all': 'all-songs',
      'trending': 'trending',
      'favorites': 'favorites',
      'recent': 'recent',
      'all-time-hits': 'all-time-hits',
      'playlists': 'playlists',
    }
    setViewMode(viewModeMap[mode])
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
      // Find songs that match the playlist's song IDs from the current songs
      return songs.filter(song =>
        selectedPlaylist.songIds?.includes(song.id)
      )
    }
    return []
  }

  // Prepare language data for dropdown
  const languageOptions = [
    { code: 'all', name: 'All Languages', count: totalCount || 0 },
    { code: 'Malayalam', name: 'Malayalam', count: languageCounts?.Malayalam || 0 },
    { code: 'English', name: 'English', count: languageCounts?.English || 0 },
    { code: 'Hindi', name: 'Hindi', count: languageCounts?.Hindi || 0 },
    { code: 'Tamil', name: 'Tamil', count: languageCounts?.Tamil || 0 },
    { code: 'Telugu', name: 'Telugu', count: languageCounts?.Telugu || 0 },
  ].filter(lang => lang.count > 0)

  // Show loading state
  if (authLoading || songsLoading || countsLoading) {
    return (
      <Box sx={{ 
        display: "flex", 
        flexDirection: "column",
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        bgcolor: "rgb(10, 10, 10)",
        p: 3,
        // Keyframes for loading animation
        "@keyframes loading-shimmer": {
          "0%": {
            transform: "translateX(-100%)",
          },
          "100%": {
            transform: "translateX(100%)",
          },
        },
      }}>
        <Box sx={{ 
          width: "60%", 
          height: 4, 
          bgcolor: "rgb(38, 38, 38)", 
          borderRadius: 2, 
          overflow: "hidden",
          position: "relative",
          mb: 2
        }}>
          <Box sx={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: "100%",
            background: "linear-gradient(90deg, transparent, rgb(59, 130, 246), transparent)",
            animation: "loading-shimmer 1.5s infinite",
          }} />
        </Box>
        <Typography variant="body2" sx={{ color: "rgb(163, 163, 163)" }}>
          Loading application...
        </Typography>
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
                <Stack direction="row" spacing={1} alignItems="center">
                  <SearchBar 
                    onSelectSong={handleSelectSong} 
                    songs={songs}
                    language={selectedLanguage}
                  />
                  <LanguageDropdown 
                    selectedLanguage={selectedLanguage}
                    onLanguageChange={handleLanguageChange}
                    languages={languageOptions}
                  />
                </Stack>
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
                justifyContent: "flex-start", 
                px: 2,
                minWidth: 0,
                ml: { xs: 0, lg: `${SIDEBAR_WIDTH}px` } // Only apply margin on desktop
              }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%", maxWidth: "none" }}>
                  <SearchBar 
                    onSelectSong={handleSelectSong} 
                    songs={songs}
                    language={selectedLanguage}
                  />
                  <LanguageDropdown 
                    selectedLanguage={selectedLanguage}
                    onLanguageChange={handleLanguageChange}
                    languages={languageOptions}
                  />
                </Stack>
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
            <FilterSidebar
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
              filterMode={filterMode}
              onFilterModeChange={handleFilterModeChange}
              songs={songs}
              history={history}
              favoritesCount={favorites.length}
              recentCount={history.length}
              playlistsCount={playlists.length}
              allSongsCount={languageCounts?.[selectedLanguage] || 0}
              onSelectSong={handleSelectSong}
              onShowAllSongs={handleShowAllSongs}
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
            <FilterSidebar
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
              filterMode={filterMode}
              onFilterModeChange={handleFilterModeChange}
              songs={songs}
              history={history}
              favoritesCount={favorites.length}
              recentCount={history.length}
              playlistsCount={playlists.length}
              allSongsCount={languageCounts?.[selectedLanguage] || 0}
              onSelectSong={handleSelectSong}
              onShowAllSongs={handleShowAllSongs}
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
