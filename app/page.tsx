"use client"

import { useState, useEffect, useMemo } from "react"
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, useMediaQuery, useTheme, CircularProgress, Stack, Avatar, Badge } from "@mui/material"
import MenuIcon from "@mui/icons-material/Menu"
import MenuBookIcon from "@mui/icons-material/MenuBook"
import ListIcon from "@mui/icons-material/List"
import SearchIcon from "@mui/icons-material/Search"
import CastIcon from "@mui/icons-material/Cast"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import { UnifiedSidebar } from "@/components/unified-sidebar"
import { FilterSidebar } from "@/components/filter-sidebar"
import { SongViewer } from "@/components/song-viewer"
import { PresentationMode } from "@/components/presentation-mode"
import { HomePage } from "@/components/home-page"
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
import { toast } from "sonner"

const SIDEBAR_WIDTH = 400

// Utility function to deduplicate songs by ID
function deduplicateSongs(songs: Song[]): Song[] {
  const seen = new Set<string>()
  return songs.filter(song => {
    if (seen.has(song.id)) {
      return false
    }
    seen.add(song.id)
    return true
  })
}

export default function Home() {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState("Telugu")
  const [viewMode, setViewMode] = useState<ViewMode>("home")
  const [filterMode, setFilterMode] = useState<FilterMode>("all")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [presentationMode, setPresentationMode] = useState(false)
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null)
  const [sidebarView, setSidebarView] = useState<'navigation' | 'songList'>('songList')
  const [scrollToSongId, setScrollToSongId] = useState<string | null>(null)

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

  // Infinite scroll for all songs (only when not in offline mode)
  const { 
    songs: onlineAllSongs, 
    loading: allSongsLoading, 
    loadingMore: allSongsLoadingMore,
    error: allSongsError, 
    hasMore, 
    loadMore, 
    reset: resetAllSongs 
  } = useInfiniteSongs(selectedLanguage)
  
  // Use online songs
  const baseAllSongs = onlineAllSongs
  const allSongsLoadingState = allSongsLoading
  const allSongsLoadingMoreState = allSongsLoadingMore
  const allSongsErrorState = allSongsError

  // Create combined allSongs that includes history songs
  const allSongs = useMemo(() => {
    if (!history || history.length === 0) {
      return baseAllSongs
    }

    // Get current song IDs from baseAllSongs
    const currentSongIds = new Set(baseAllSongs.map(s => s.id))
    const missingHistorySongs: Song[] = []
    
    for (const historyItem of history) {
      if (!currentSongIds.has(historyItem.id)) {
        // Transform history item to Song object
        if (historyItem.id && historyItem.title && historyItem.artist?.id && historyItem.artist?.name) {
          const song: Song = {
            id: historyItem.id,
            title: historyItem.title,
            titleTransliteration: historyItem.titleTransliteration || '',
            artist: {
              id: historyItem.artist.id,
              name: historyItem.artist.name,
              photoUrl: historyItem.artist.photoUrl || '',
              totalSongs: 0,
              totalViews: 0,
            },
            language: historyItem.language as "Telugu" | "Malayalam" | "English" | "Hindi" | "Tamil" | "Bengali" | "Kannada",
            tags: [],
            lyrics: [],
            englishLyrics: [],
            chords: [],
            originalKey: '',
            thumbnail: historyItem.thumbnail || '',
            hasVideo: false,
            videoUrl: '',
            youtubeViews: 0,
            youtubeLikes: 0,
            releaseDate: '',
            viewCount: 0,
            trending: false,
          }
          missingHistorySongs.push(song)
        }
      }
    }
    
    // Combine base songs with missing history songs
    const combinedSongs = [...baseAllSongs, ...missingHistorySongs]
    
    // Remove duplicates
    return combinedSongs.filter((song, index, self) => 
      index === self.findIndex(s => s.id === song.id)
    )
  }, [baseAllSongs, history])

  // Debug logging
  console.log('🎵 Main page songs state:', {
    allSongsCount: allSongs.length,
    allSongsLoading: allSongsLoadingState,
    allSongsError: allSongsErrorState,
    hasMore,
    selectedLanguage,
    allSongsTitles: allSongs.slice(0, 3).map(s => s.title)
  })

  // Wrapper functions to handle async operations with optimistic updates
  const handleToggleFavorite = async (songId: string) => {
    const isCurrentlyFavorite = favorites.some(fav => fav.id === songId)
    const isOptimisticallyFavorite = optimisticFavorites.has(songId)
    
    // Determine the current effective state (real + optimistic)
    const currentEffectiveState = isCurrentlyFavorite || isOptimisticallyFavorite
    const willBeFavorite = !currentEffectiveState

    // Optimistic update - immediately update UI
    setOptimisticFavorites(prev => {
      const newSet = new Set(prev)
      if (willBeFavorite) {
        newSet.add(songId)
      } else {
        newSet.delete(songId)
      }
      return newSet
    })

    try {
      await toggleFavoriteStatus(songId)
      // Clear optimistic state on success
      setOptimisticFavorites(prev => {
        const newSet = new Set(prev)
        newSet.delete(songId)
        return newSet
      })
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      // Revert optimistic update on error
      setOptimisticFavorites(prev => {
        const newSet = new Set(prev)
        if (willBeFavorite) {
          newSet.delete(songId)
        } else {
          newSet.add(songId)
        }
        return newSet
      })
      toast.error('Failed to update favorite. Please try again.')
    }
  }

  const handleToggleFavoriteNoArgs = async () => {
    // This will be called from SongViewer component
    if (selectedSong) {
      await handleToggleFavorite(selectedSong.id)
    }
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
  const { songs: onlineSongs, loading: songsLoading, error: songsError } = useSongs(songsOptions)
  
  // Use online songs
  const songs = onlineSongs
  const songsLoadingState = songsLoading
  const songsErrorState = songsError
  
  // State for recently visited songs from history
  const [recentSongs, setRecentSongs] = useState<Song[]>([])
  
  // State for optimistic favorite updates
  const [optimisticFavorites, setOptimisticFavorites] = useState<Set<string>>(new Set())

  // Disabled history processing to prevent sidebar reordering
  useEffect(() => {
    console.log('🔍 History processing disabled to prevent sidebar reordering')
    // Keep recentSongs empty to prevent any reordering
    setRecentSongs([])
  }, []) // Disabled - empty dependency array prevents reordering

  // Combine original songs with searched songs and recent songs for sidebar
  const combinedSongs = useMemo(() => {
    console.log('🔄 Creating stable sidebar songs:', {
      originalSongs: songs.length
    })

    // Start with current songs only - no history-based additions for stable sidebar
    const allSongs = [...songs]
    
    console.log('📊 All songs before deduplication:', {
      total: allSongs.length,
      songIds: allSongs.map(s => s.id),
      hasDuplicates: allSongs.length !== new Set(allSongs.map(s => s.id)).size
    })
    
    // Remove duplicates using efficient deduplication function
    const uniqueSongs = deduplicateSongs(allSongs)
    
    console.log('✅ Final combined songs:', {
      total: uniqueSongs.length,
      removedDuplicates: allSongs.length - uniqueSongs.length,
      songTitles: uniqueSongs.map(s => s.title),
      songIds: uniqueSongs.map(s => s.id)
    })
    
    return uniqueSongs
  }, [songs]) // Only depends on songs - completely stable sidebar

  // Combined songs for search (includes history for search results)
  const searchSongs = useMemo(() => {
    console.log('🔄 Creating search songs:', {
      sidebarSongs: combinedSongs.length,
      recentSongs: recentSongs.length,
      historyLength: history?.length || 0
    })

    // Start with stable sidebar songs
    const allSongs = [...combinedSongs]
    
    // Add recent songs for search functionality
    allSongs.push(...recentSongs)
    
    // Add history songs that are not already in the list (for search results)
    if (history && history.length > 0) {
      const currentSongIds = new Set(allSongs.map(s => s.id))
      const missingHistorySongs: Song[] = []
      
      for (const historyItem of history) {
        if (!currentSongIds.has(historyItem.id)) {
          // Transform history item to Song object
          if (historyItem.id && historyItem.title && historyItem.artist?.id && historyItem.artist?.name) {
            const song: Song = {
              id: historyItem.id,
              title: historyItem.title,
              titleTransliteration: historyItem.titleTransliteration || '',
              artist: {
                id: historyItem.artist.id,
                name: historyItem.artist.name,
                photoUrl: historyItem.artist.photoUrl || '',
                totalSongs: 0,
                totalViews: 0,
              },
              language: historyItem.language as "Telugu" | "Malayalam" | "English" | "Hindi" | "Tamil" | "Bengali" | "Kannada",
              tags: [],
              lyrics: [],
              englishLyrics: [],
              chords: [],
              originalKey: '',
              thumbnail: historyItem.thumbnail || '',
              hasVideo: false,
              videoUrl: '',
              youtubeViews: 0,
              youtubeLikes: 0,
              releaseDate: '',
              viewCount: 0,
              trending: false,
            }
            missingHistorySongs.push(song)
          }
        }
      }
      
      allSongs.push(...missingHistorySongs)
    }
    
    // Remove duplicates using efficient deduplication function
    const uniqueSongs = deduplicateSongs(allSongs)
    
    console.log('✅ Final search songs:', {
      total: uniqueSongs.length,
      removedDuplicates: allSongs.length - uniqueSongs.length
    })
    
    return uniqueSongs
  }, [combinedSongs, recentSongs, history])

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleSelectSong = async (song: Song) => {
    setSelectedSong(song)
    
    // Only track history for sidebar clicks - nothing else
    if (song?.id && typeof song.id === 'string') {
      try {
        addToHistory(song.id)
      } catch (error) {
        console.error('Failed to add song to history:', error)
        // Don't prevent song selection from working
      }
    }
    
    if (isMobile) {
      setMobileOpen(false)
    }
  }

  const handleSelectSongFromSearch = async (song: Song) => {
    console.log('🎵 Song selected from search:', song.title, song.id)
    setSelectedSong(song)
    
    // Only track history for search results that are not already in the sidebar
    const isAlreadyInSidebar = combinedSongs.some(s => s.id === song.id)
    console.log('🔍 Is song already in sidebar?', isAlreadyInSidebar)
    
    if (!isAlreadyInSidebar && song?.id && typeof song.id === 'string') {
      console.log('➕ Adding search result to history:', song.title)
      try {
        addToHistory(song.id)
      } catch (error) {
        console.error('Failed to add song to history:', error)
        // Don't prevent song selection from working
      }
    } else if (isAlreadyInSidebar) {
      console.log('ℹ️ Song already in sidebar, not tracking in history')
    } else {
      console.error('Invalid song object passed to handleSelectSongFromSearch:', song)
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
    console.log('🔄 Showing loading state:', { authLoading, songsLoading, countsLoading })
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
      {/* YouTube Music Style App Bar */}
      <AppBar
        position="fixed"
        sx={{
          bgcolor: "rgb(15, 15, 15)",
          borderBottom: "none",
          boxShadow: "none",
          zIndex: 1200,
        }}
      >
        <Toolbar 
          sx={{ 
            minHeight: "64px", 
            px: { xs: 2, sm: 3 },
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          {/* Left Side - Hamburger Menu + Logo */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton
              color="inherit"
              onClick={handleDrawerToggle}
              sx={{ 
                color: "rgb(250, 250, 250)",
                p: 1,
                "&:hover": {
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                }
              }}
            >
              <MenuIcon />
            </IconButton>
            
            {/* App Logo with Play Button */}
            <Box 
              sx={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 1,
                cursor: "pointer",
                "&:hover": {
                  opacity: 0.8
                }
              }}
              onClick={() => {
                setViewMode("home")
                setFilterMode("all")
                setSelectedSong(null)
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  bgcolor: "rgb(255, 0, 0)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <PlayArrowIcon 
                  sx={{ 
                    color: "white", 
                    fontSize: "1.2rem",
                    ml: 0.5
                  }} 
                />
              </Box>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: "rgb(250, 250, 250)", 
                  fontWeight: 500,
                  fontSize: "1.25rem",
                  letterSpacing: "-0.5px"
                }}
              >
                GNC Worship Tools
              </Typography>
            </Box>
          </Box>

          {/* Center - Search Bar */}
          <Box sx={{ 
            flex: 1, 
            maxWidth: 600,
            mx: 4,
            display: "flex",
            alignItems: "center",
            // Hide on mobile but keep it rendered for mobile search functionality
            visibility: isMobile ? "hidden" : "visible",
            position: isMobile ? "absolute" : "relative",
            left: isMobile ? "-9999px" : "auto"
          }}>
            <SearchBar 
              onSelectSong={handleSelectSongFromSearch} 
              songs={combinedSongs}
              language={selectedLanguage}
              onMobileSearchClick={() => {
                // This will be handled by the SearchBar component
              }}
            />
          </Box>

          {/* Right Side - Icons + User */}
          <Box sx={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 1
          }}>
            {/* Mobile Search Icon */}
            {isMobile && (
              <IconButton
                color="inherit"
                onClick={() => {
                  // Trigger mobile search overlay
                  console.log('🔍 Mobile search icon clicked')
                  if (typeof (window as any).triggerMobileSearch === 'function') {
                    console.log('✅ triggerMobileSearch function found, calling it')
                    ;(window as any).triggerMobileSearch()
                  } else {
                    console.log('❌ triggerMobileSearch function not found')
                  }
                }}
                sx={{ 
                  color: "rgb(250, 250, 250)",
                  p: 1,
                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                  }
                }}
              >
                <SearchIcon />
              </IconButton>
            )}

            {/* Language Dropdown (Desktop only) */}
            {!isMobile && (
              <LanguageDropdown 
                selectedLanguage={selectedLanguage}
                onLanguageChange={handleLanguageChange}
                languages={languageOptions}
              />
            )}

            {/* Cast Icon */}
            <IconButton
              color="inherit"
              sx={{ 
                color: "rgb(250, 250, 250)",
                p: 1,
                "&:hover": {
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                }
              }}
            >
              <CastIcon />
            </IconButton>

            {/* User Profile */}
            {user ? (
              <Avatar
                src={user.user_metadata?.avatar_url || '/placeholder-user.jpg'}
                sx={{
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  "&:hover": {
                    boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.2)",
                  }
                }}
                onClick={() => {
                  // Handle user menu click
                }}
              />
            ) : (
              <IconButton
                color="inherit"
                sx={{ 
                  color: "rgb(250, 250, 250)",
                  p: 1,
                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                  }
                }}
              >
                <LoginButton />
              </IconButton>
            )}
          </Box>
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
                width: "90vw", // Use 90% of viewport width on mobile
                maxWidth: SIDEBAR_WIDTH, // But don't exceed the desktop width
                bgcolor: "rgb(20, 20, 20)",
                borderRight: "1px solid rgb(38, 38, 38)",
                mt: "64px",
                height: "calc(100vh - 64px)",
                overflow: "hidden", // Ensure proper scroll container
                display: "flex",
                flexDirection: "column",
              },
            }}
          >
            <FilterSidebar
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
              filterMode={filterMode}
              onFilterModeChange={handleFilterModeChange}
              songs={combinedSongs}
              allSongs={allSongs}
              allSongsLoading={allSongsLoadingState}
              allSongsLoadingMore={allSongsLoadingMoreState}
              allSongsError={allSongsErrorState}
              allSongsHasMore={hasMore}
              onLoadMoreAllSongs={loadMore}
              history={history}
              favoritesCount={favorites.length}
              recentCount={history.length}
              playlistsCount={playlists.length}
              allSongsCount={languageCounts?.[selectedLanguage] || 0}
              onSelectSong={handleSelectSong}
              onShowAllSongs={handleShowAllSongs}
              selectedSongId={selectedSong?.id}
              onToggleFavorite={handleToggleFavorite}
              isFavorite={(songId: string) => {
                const isRealFavorite = favorites.some(fav => fav.id === songId)
                const isOptimisticFavorite = optimisticFavorites.has(songId)
                return isRealFavorite || isOptimisticFavorite
              }}
              scrollToSongId={scrollToSongId}
              onScrollComplete={() => setScrollToSongId(null)}
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
                mt: "64px",
                height: "calc(100vh - 64px)",
                overflow: "hidden", // Ensure proper scroll container
                display: "flex",
                flexDirection: "column",
              },
            }}
            open
          >
            <FilterSidebar
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
              filterMode={filterMode}
              onFilterModeChange={handleFilterModeChange}
              songs={combinedSongs}
              allSongs={allSongs}
              allSongsLoading={allSongsLoadingState}
              allSongsLoadingMore={allSongsLoadingMoreState}
              allSongsError={allSongsErrorState}
              allSongsHasMore={hasMore}
              onLoadMoreAllSongs={loadMore}
              history={history}
              favoritesCount={favorites.length}
              recentCount={history.length}
              playlistsCount={playlists.length}
              allSongsCount={languageCounts?.[selectedLanguage] || 0}
              onSelectSong={handleSelectSong}
              onShowAllSongs={handleShowAllSongs}
              selectedSongId={selectedSong?.id}
              onToggleFavorite={handleToggleFavorite}
              isFavorite={(songId: string) => {
                const isRealFavorite = favorites.some(fav => fav.id === songId)
                const isOptimisticFavorite = optimisticFavorites.has(songId)
                return isRealFavorite || isOptimisticFavorite
              }}
              scrollToSongId={scrollToSongId}
              onScrollComplete={() => setScrollToSongId(null)}
            />
          </Drawer>
        )}
      </Box>


      {/* Main Content - Song Viewer or Home Page */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { 
            xs: "100%", 
            lg: `calc(100% - ${SIDEBAR_WIDTH}px)` 
          },
          mt: "64px", // Updated for new navbar height
          height: "calc(100vh - 64px)",
          // Improved mobile padding and layout
          px: { xs: 1, sm: 2 },
          py: { xs: 1, sm: 2 },
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
            isFavorite={selectedSong ? (favorites.some(fav => fav.id === selectedSong.id) || optimisticFavorites.has(selectedSong.id)) : false}
          />
        ) : viewMode === "home" ? (
          <HomePage onSelectSong={handleSelectSongFromSearch} />
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              bgcolor: "rgb(20, 20, 20)",
              px: { xs: 3, sm: 4 },
              py: { xs: 4, sm: 6 },
              textAlign: "center",
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                color: "rgb(163, 163, 163)", 
                     mb: { xs: 2, sm: 1 },
                     fontSize: { xs: '1.1rem', sm: '1.25rem' }
              }}
            >
              Select a song to view
            </Typography>
            {isMobile && (
              <Typography 
                variant="body2" 
                sx={{ 
                  color: "rgb(100, 100, 100)", 
                  maxWidth: { xs: 280, sm: 300 },
                  lineHeight: 1.5,
                  fontSize: { xs: '0.875rem', sm: '0.9rem' }
                }}
              >
                Tap the menu icon in the top bar to browse songs, or use the search bar to find a specific song.
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
