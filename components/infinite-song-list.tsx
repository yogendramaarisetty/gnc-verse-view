"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  CardMedia,
  IconButton,
  Tooltip,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import VisibilityIcon from '@mui/icons-material/Visibility'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import HistoryIcon from '@mui/icons-material/History'
import type { Song } from '@/lib/types'
import type { HistorySong } from '@/lib/api/history'
import { storage } from '@/lib/storage'
import type { ViewMode } from './language-sidebar'

interface InfiniteSongListProps {
  songs: Song[]
  onSelectSong: (song: Song) => void
  selectedSongId?: string
  selectedLanguage: string
  viewMode: ViewMode
  history?: HistorySong[]
  onLoadMore?: () => void
  hasMore?: boolean
  loading?: boolean
  loadingMore?: boolean
  error?: string | null
  onToggleFavorite?: (songId: string) => void
  isFavorite?: (songId: string) => boolean
  scrollToSongId?: string | null
  onScrollComplete?: () => void
}

export function InfiniteSongList({
  songs,
  onSelectSong,
  selectedSongId,
  selectedLanguage,
  viewMode,
  history = [],
  onLoadMore,
  hasMore = false,
  loading = false,
  loadingMore = false,
  error = null,
  onToggleFavorite,
  isFavorite,
  scrollToSongId,
  onScrollComplete,
}: InfiniteSongListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'views' | 'trending'>('title')
  const [filterBy, setFilterBy] = useState<string>('all')
  const observerTarget = useRef<HTMLDivElement>(null)
  const initialHistoryRef = useRef<HistorySong[]>([])

  // Capture initial history state to prevent reordering during interaction
  useEffect(() => {
    if (history && history.length > 0 && initialHistoryRef.current.length === 0) {
      initialHistoryRef.current = [...history]
      console.log('📚 Captured initial history:', initialHistoryRef.current.length, 'items')
    }
  }, [history])

  // Debug logging
  console.log('🎵 InfiniteSongList props:', {
    songsCount: songs.length,
    loading,
    loadingMore,
    error,
    hasMore,
    viewMode,
    selectedLanguage,
    firstSong: songs[0]?.title || 'No songs'
  })

  // Force re-render test
  useEffect(() => {
    console.log('🔄 InfiniteSongList mounted/updated:', {
      songsCount: songs.length,
      loading,
      viewMode
    })
  }, [songs.length, loading, viewMode])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && onLoadMore) {
          onLoadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [hasMore, loadingMore, onLoadMore])

  // Scroll to specific song when scrollToSongId changes
  useEffect(() => {
    if (scrollToSongId && songs.length > 0) {
      console.log('🎯 Attempting to scroll to song:', scrollToSongId)
      const songIndex = songs.findIndex(song => song.id === scrollToSongId)
      console.log('📍 Song index in list:', songIndex)
      
      if (songIndex !== -1) {
        // Use a more robust approach with multiple retries
        const attemptScroll = (attempt = 1, maxAttempts = 5) => {
          const songElement = document.getElementById(`song-${scrollToSongId}`)
          console.log(`🔍 Attempt ${attempt}: Found song element:`, !!songElement)
          
          if (songElement) {
            console.log('📜 Scrolling to song element')
            songElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            })
            // Call onScrollComplete after scrolling
            if (onScrollComplete) {
              setTimeout(() => {
                console.log('✅ Scroll complete')
                onScrollComplete()
              }, 500)
            }
          } else if (attempt < maxAttempts) {
            console.log(`❌ Song element not found, retrying in ${attempt * 100}ms (attempt ${attempt + 1}/${maxAttempts})`)
            setTimeout(() => attemptScroll(attempt + 1, maxAttempts), attempt * 100)
          } else {
            console.log('❌ All retry attempts failed, element not found')
          }
        }
        
        attemptScroll()
      } else {
        console.log('❌ Song not found in songs list')
      }
    }
  }, [scrollToSongId, songs, onScrollComplete])

  // Filter and sort songs
  const filteredSongs = useMemo(() => {
    console.log('🔍 Filtering songs:', { 
      originalCount: songs.length, 
      viewMode, 
      searchQuery,
      sortBy 
    })
    
    // First deduplicate songs by ID to prevent duplicates
    const uniqueSongs = songs.filter((song, index, self) => 
      index === self.findIndex(s => s.id === song.id)
    )
    
    console.log('🔄 After deduplication:', { uniqueCount: uniqueSongs.length })
    
    let filtered = uniqueSongs

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (song) =>
          song.title.toLowerCase().includes(query) ||
          song.titleTransliteration?.toLowerCase().includes(query) ||
          song.artist.name.toLowerCase().includes(query) ||
          song.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Filter by viewMode
    if (viewMode !== 'all' && viewMode !== 'all-songs') {
      filtered = filtered.filter((song) => {
        switch (viewMode) {
          case 'trending':
            return song.trending
          case 'favorites':
            return isFavorite ? isFavorite(song.id) : false
          case 'recent':
            return history.some((h) => h.songId === song.id)
          default:
            return true
        }
      })
    }

    // Use stable initial history to prevent reordering during interaction
    const stableHistory = initialHistoryRef.current
    if (stableHistory && stableHistory.length > 0) {
      console.log('🔄 Sorting with stable recent songs at top:', {
        stableHistoryLength: stableHistory.length,
        stableHistoryIds: stableHistory.map(h => h.id),
        songCount: filtered.length
      })
      
      // Create a map of recent song IDs with their visit order (lower index = more recent)
      const recentSongOrder = new Map<string, number>()
      stableHistory.forEach((historyItem, index) => {
        recentSongOrder.set(historyItem.id, index)
      })

      // Sort songs with recent songs first, then by the specified sort criteria
      filtered.sort((a, b) => {
        const aIsRecent = recentSongOrder.has(a.id)
        const bIsRecent = recentSongOrder.has(b.id)
        
        console.log(`🔍 Comparing ${a.title} (recent: ${aIsRecent}) vs ${b.title} (recent: ${bIsRecent})`)
        
        // If both are recent, sort by visit order (most recent first)
        if (aIsRecent && bIsRecent) {
          const aOrder = recentSongOrder.get(a.id) || 0
          const bOrder = recentSongOrder.get(b.id) || 0
          console.log(`📊 Both recent: ${a.title} (order: ${aOrder}) vs ${b.title} (order: ${bOrder})`)
          return aOrder - bOrder
        }
        
        // If only one is recent, prioritize the recent one
        if (aIsRecent && !bIsRecent) {
          console.log(`✅ ${a.title} is recent, prioritizing over ${b.title}`)
          return -1
        }
        if (!aIsRecent && bIsRecent) {
          console.log(`✅ ${b.title} is recent, prioritizing over ${a.title}`)
          return 1
        }
        
        // If neither is recent, sort by the specified criteria
        switch (sortBy) {
          case 'title':
            return a.title.localeCompare(b.title)
          case 'artist':
            return a.artist.name.localeCompare(b.artist.name)
          case 'views':
            return (b.viewCount || 0) - (a.viewCount || 0)
          case 'trending':
            return Number(b.trending) - Number(a.trending)
          default:
            // Default sorting: trending first, then by view count (descending), then by title (ascending)
            if (a.trending && !b.trending) return -1
            if (!a.trending && b.trending) return 1
            if (a.trending === b.trending) {
              const viewDiff = (b.viewCount || 0) - (a.viewCount || 0)
              if (viewDiff !== 0) return viewDiff
              return a.title.localeCompare(b.title)
            }
            return 0
        }
      })
    } else {
      console.log('🔄 No history, using standard sorting')
      // No history, use standard sorting
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'title':
            return a.title.localeCompare(b.title)
          case 'artist':
            return a.artist.name.localeCompare(b.artist.name)
          case 'views':
            return (b.viewCount || 0) - (a.viewCount || 0)
          case 'trending':
            return Number(b.trending) - Number(a.trending)
          default:
            // Default sorting: trending first, then by view count (descending), then by title (ascending)
            if (a.trending && !b.trending) return -1
            if (!a.trending && b.trending) return 1
            if (a.trending === b.trending) {
              const viewDiff = (b.viewCount || 0) - (a.viewCount || 0)
              if (viewDiff !== 0) return viewDiff
              return a.title.localeCompare(b.title)
            }
            return 0
        }
      })
    }

    console.log('✅ Final filtered songs:', { 
      filteredCount: filtered.length,
      firstSong: filtered[0]?.title || 'No songs'
    })

    return filtered
  }, [songs, searchQuery, viewMode, sortBy, isFavorite]) // Removed history dependency to prevent reordering during interaction


  // Format numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  // Loading state
  if (loading && songs.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '200px', p: 3 }}>
        <Box sx={{ 
          width: "80%", 
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
          Loading songs...
        </Typography>
      </Box>
    )
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  console.log('🎨 Rendering InfiniteSongList:', { 
    songsCount: songs.length, 
    filteredCount: filteredSongs.length,
    loading,
    viewMode 
  })

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
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
      {/* Song List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {filteredSongs.length === 0 && !loading ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            py: 4, 
            px: 3,
            textAlign: 'center'
          }}>
            <Typography variant="h6" sx={{ color: 'rgb(163, 163, 163)', mb: 1 }}>
              No songs available
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgb(163, 163, 163)' }}>
              {viewMode === 'favorites' ? 'No favorite songs yet' :
               viewMode === 'recent' ? 'No recently viewed songs' :
               viewMode === 'trending' ? 'No trending songs available' :
               'No songs found for the current filter'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgb(100, 100, 100)', mt: 1 }}>
              Debug: {songs.length} songs received, loading: {loading.toString()}
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {filteredSongs.map((song) => {
              // Check if this song is recently visited
              const isRecentlyVisited = history.some((h) => h.id === song.id)
              
              return (
                <ListItem 
                  key={song.id} 
                  id={`song-${song.id}`}
                  disablePadding
              secondaryAction={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {isRecentlyVisited && (
                    <Tooltip title="Recently visited">
                      <HistoryIcon sx={{ fontSize: '0.875rem', color: 'rgb(59, 130, 246)' }} />
                    </Tooltip>
                  )}
                  {onToggleFavorite && isFavorite ? (
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleFavorite(song.id)
                      }}
                      sx={{
                        color: isFavorite(song.id) ? "#e91e63" : "rgb(163, 163, 163)"
                      }}
                    >
                      {isFavorite(song.id) ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                    </IconButton>
                  ) : null}
                </Box>
              }
                >
              <ListItemButton
                onClick={() => onSelectSong(song)}
                selected={selectedSongId === song.id}
                sx={{
                  py: 0.5,
                  px: 1,
                  minHeight: 48,
                  pr: (onToggleFavorite || isRecentlyVisited) ? 5 : 1, // Add padding for favorite button and recent indicator
                  '&.Mui-selected': {
                    bgcolor: 'rgb(30, 30, 30)',
                    '&:hover': {
                      bgcolor: 'rgb(40, 40, 40)',
                    },
                  },
                  '&:hover': {
                    bgcolor: 'rgb(25, 25, 25)',
                  },
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    src={song.thumbnail}
                    sx={{
                      width: { xs: 36, sm: 40 },
                      height: { xs: 36, sm: 40 },
                      bgcolor: 'rgb(38, 38, 38)',
                      borderRadius: 1, // Square corners
                    }}
                  >
                    <PlayArrowIcon sx={{ color: 'rgb(163, 163, 163)', fontSize: { xs: 14, sm: 16 } }} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'rgb(250, 250, 250)', 
                        fontWeight: 500, 
                        fontSize: { xs: '0.8rem', sm: '0.875rem' },
                        lineHeight: 1.3
                      }}
                    >
                      {song.titleTransliteration ? `${song.title} | ${song.titleTransliteration}` : song.title}
                      {song.trending && (
                        <TrendingUpIcon sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, color: 'rgb(59, 130, 246)', ml: 0.5, verticalAlign: 'middle' }} />
                      )}
                    </Typography>
                  }
                  secondary={
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'rgb(163, 163, 163)', 
                        fontSize: { xs: '0.65rem', sm: '0.7rem' },
                        lineHeight: 1.2
                      }}
                    >
                      {song.artist.name} • {formatNumber(song.viewCount)} views
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
              )
            })}
        </List>
        )}

        {/* Loading More Indicator */}
        {loadingMore && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2, px: 3 }}>
            <Box sx={{ 
              width: "60%", 
              height: 3, 
              bgcolor: "rgb(38, 38, 38)", 
              borderRadius: 2, 
              overflow: "hidden",
              position: "relative",
              mb: 1
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
            <Typography variant="body2" sx={{ color: 'rgb(163, 163, 163)' }}>
              Loading more songs...
            </Typography>
          </Box>
        )}

        {/* End of List Indicator */}
        {!hasMore && songs.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <Typography variant="caption" sx={{ color: 'rgb(163, 163, 163)' }}>
              You've reached the end of the list
            </Typography>
          </Box>
        )}

        {/* Intersection Observer Target */}
        <div ref={observerTarget} style={{ height: '1px' }} />
      </Box>
    </Box>
  )
}