"use client"

import { useState, useMemo } from "react"
import {
  Box,
  Typography,
  Chip,
  Stack,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material"
import TrendingUpIcon from "@mui/icons-material/TrendingUp"
import StarIcon from "@mui/icons-material/Star"
import HistoryIcon from "@mui/icons-material/History"
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents"
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay"
import FilterListIcon from "@mui/icons-material/FilterList"
import SearchIcon from "@mui/icons-material/Search"
import type { Song } from "@/lib/types"
import type { HistorySong } from "@/lib/api/history"
import { InfiniteSongList } from "@/components/infinite-song-list"
import { SearchBar } from "@/components/search-bar"

export type FilterMode = 
  | "all"
  | "trending"
  | "favorites"
  | "recent"
  | "all-time-hits"
  | "playlists"

interface FilterSidebarProps {
  selectedLanguage: string
  onLanguageChange: (language: string) => void
  filterMode: FilterMode
  onFilterModeChange: (mode: FilterMode) => void
  songs: Song[]
  allSongs?: Song[]
  allSongsLoading?: boolean
  allSongsLoadingMore?: boolean
  allSongsError?: string | null
  allSongsHasMore?: boolean
  onLoadMoreAllSongs?: () => void
  history: HistorySong[]
  favoritesCount: number
  recentCount: number
  playlistsCount: number
  allSongsCount: number
  onSelectSong: (song: Song) => void
  onShowAllSongs: () => void
  selectedSongId?: string
  onToggleFavorite?: (songId: string) => void
  isFavorite?: (songId: string) => boolean
}

export function FilterSidebar({
  selectedLanguage,
  onLanguageChange,
  filterMode,
  onFilterModeChange,
  songs,
  allSongs,
  allSongsLoading,
  allSongsLoadingMore,
  allSongsError,
  allSongsHasMore,
  onLoadMoreAllSongs,
  history,
  favoritesCount,
  recentCount,
  playlistsCount,
  allSongsCount,
  onSelectSong,
  onShowAllSongs,
  selectedSongId,
  onToggleFavorite,
  isFavorite,
}: FilterSidebarProps) {
  const [showSearch, setShowSearch] = useState(false)
  
  // No longer need local infinite scroll - using data from parent

  // Calculate counts for each filter
  const filterCounts = useMemo(() => {
    const trendingCount = songs.filter(s => s.trending).length
    const allTimeHitsCount = songs.filter(s => s.youtubeViews > 1000000).length
    
    return {
      all: allSongsCount,
      trending: trendingCount,
      favorites: favoritesCount,
      recent: recentCount,
      'all-time-hits': allTimeHitsCount,
      playlists: playlistsCount,
    }
  }, [songs, allSongsCount, favoritesCount, recentCount, playlistsCount])

  // Handle filter mode changes without resetting data
  const handleFilterModeChange = (mode: FilterMode) => {
    onFilterModeChange(mode)
    // Don't reset infinite scroll when switching filters - use existing data
    // Only reset when language changes (handled by the parent component)
  }

  const filterOptions = [
    {
      id: 'all' as FilterMode,
      label: `All ${selectedLanguage} Songs`,
      icon: <FilterListIcon sx={{ fontSize: '1rem' }} />,
      count: filterCounts.all,
      color: 'primary' as const,
    },
    {
      id: 'trending' as FilterMode,
      label: 'Trending',
      icon: <TrendingUpIcon sx={{ fontSize: '1rem' }} />,
      count: filterCounts.trending,
      color: 'secondary' as const,
    },
    {
      id: 'recent' as FilterMode,
      label: 'Recent',
      icon: <HistoryIcon sx={{ fontSize: '1rem' }} />,
      count: filterCounts.recent,
      color: 'success' as const,
    },
    {
      id: 'favorites' as FilterMode,
      label: 'Favorites',
      icon: <StarIcon sx={{ fontSize: '1rem' }} />,
      count: filterCounts.favorites,
      color: 'warning' as const,
    },
    {
      id: 'all-time-hits' as FilterMode,
      label: 'All-Time Hits',
      icon: <EmojiEventsIcon sx={{ fontSize: '1rem' }} />,
      count: filterCounts['all-time-hits'],
      color: 'error' as const,
    },
    {
      id: 'playlists' as FilterMode,
      label: 'Playlists',
      icon: <PlaylistPlayIcon sx={{ fontSize: '1rem' }} />,
      count: filterCounts.playlists,
      color: 'info' as const,
    },
  ]

  return (
    <Box sx={{ 
      height: "100%", 
      display: "flex", 
      flexDirection: "column",
      bgcolor: "rgb(20, 20, 20)",
      borderRight: "1px solid rgb(38, 38, 38)",
    }}>
      {/* Search Bar */}
      <Box sx={{ 
        p: 2, 
        borderBottom: "1px solid rgb(38, 38, 38)",
        bgcolor: "rgb(25, 25, 25)",
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Typography variant="caption" sx={{ 
            color: "rgb(163, 163, 163)", 
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            fontWeight: 600,
            flex: 1,
          }}>
            Search & Filter
          </Typography>
          <Tooltip title={showSearch ? "Hide search" : "Show search"}>
            <IconButton
              size="small"
              onClick={() => setShowSearch(!showSearch)}
              sx={{ 
                color: showSearch ? "rgb(59, 130, 246)" : "rgb(163, 163, 163)",
                "&:hover": {
                  bgcolor: "rgb(30, 30, 30)",
                }
              }}
            >
              <SearchIcon sx={{ fontSize: "1rem" }} />
            </IconButton>
          </Tooltip>
        </Box>
        
        {showSearch && (
          <Box sx={{ mb: 2 }}>
            <SearchBar 
              onSelectSong={onSelectSong} 
              songs={songs}
              language={selectedLanguage}
            />
          </Box>
        )}
      </Box>

      {/* Filter Chips - Horizontal Scroll */}
      <Box sx={{ 
        p: 2, 
        borderBottom: "1px solid rgb(38, 38, 38)",
        bgcolor: "rgb(25, 25, 25)",
      }}>
        <Typography variant="caption" sx={{ 
          color: "rgb(163, 163, 163)", 
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          fontWeight: 600,
          mb: 1,
          display: "block",
        }}>
          Popular Filters
        </Typography>
          
        <Box sx={{ 
          display: "flex", 
          gap: 1, 
          overflowX: "auto",
          pb: 1,
          "&::-webkit-scrollbar": {
            height: 4,
          },
          "&::-webkit-scrollbar-track": {
            bgcolor: "rgb(38, 38, 38)",
            borderRadius: 2,
          },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "rgb(64, 64, 64)",
            borderRadius: 2,
            "&:hover": {
              bgcolor: "rgb(82, 82, 82)",
            },
          },
        }}>
          {filterOptions.map((filter) => (
            <Chip
              key={filter.id}
              label={filter.id === 'all' ? filter.label : `${filter.label} (${filter.count})`}
              icon={filter.icon}
              onClick={() => handleFilterModeChange(filter.id)}
              variant={filterMode === filter.id ? "filled" : "outlined"}
              color={filterMode === filter.id ? filter.color : "default"}
              size="small"
              sx={{
                minWidth: "fit-content",
                whiteSpace: "nowrap",
                fontSize: "0.75rem",
                height: 32,
                "&.MuiChip-outlined": {
                  borderColor: "rgb(64, 64, 64)",
                  color: "rgb(163, 163, 163)",
                  "&:hover": {
                    borderColor: "rgb(82, 82, 82)",
                    color: "rgb(250, 250, 250)",
                    bgcolor: "rgb(30, 30, 30)",
                  },
                },
                "&.MuiChip-filled": {
                  fontWeight: 600,
                  "&:hover": {
                    opacity: 0.9,
                  },
                },
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Content Area - Song List */}
      <Box sx={{ flex: 1, overflow: "hidden" }}>
        {filterMode === 'all' ? (
          <InfiniteSongList
            songs={allSongs || []}
            onSelectSong={onSelectSong}
            selectedSongId={selectedSongId}
            selectedLanguage={selectedLanguage}
            viewMode="all-songs"
            history={history}
            onLoadMore={onLoadMoreAllSongs || (() => {})}
            hasMore={allSongsHasMore || false}
            loading={allSongsLoading || false}
            loadingMore={allSongsLoadingMore || false}
            error={allSongsError}
            onToggleFavorite={onToggleFavorite}
            isFavorite={isFavorite}
          />
        ) : (
          <InfiniteSongList
            songs={songs}
            onSelectSong={onSelectSong}
            selectedSongId={selectedSongId}
            selectedLanguage={selectedLanguage}
            viewMode={filterMode}
            history={history}
            onLoadMore={() => {}} // No infinite scroll for filtered views
            hasMore={false}
            loading={false}
            loadingMore={false}
            error={null}
            onToggleFavorite={onToggleFavorite}
            isFavorite={isFavorite}
          />
        )}
      </Box>
    </Box>
  )
}
