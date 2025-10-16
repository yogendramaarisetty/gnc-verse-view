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
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import VisibilityIcon from '@mui/icons-material/Visibility'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
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
}: InfiniteSongListProps) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'views' | 'trending'>('title')
  const [filterBy, setFilterBy] = useState<string>('all')
  const observerTarget = useRef<HTMLDivElement>(null)

  // Load favorites from storage
  useEffect(() => {
    const savedFavorites = storage.getFavorites()
    setFavorites(new Set(savedFavorites))
  }, [])

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

  // Filter and sort songs
  const filteredSongs = useMemo(() => {
    let filtered = songs

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

    // Filter by category
    if (filterBy !== 'all') {
      filtered = filtered.filter((song) => {
        switch (filterBy) {
          case 'trending':
            return song.trending
          case 'favorites':
            return favorites.has(song.id)
          case 'recent':
            return history.some((h) => h.songId === song.id)
          default:
            return true
        }
      })
    }

    // Sort songs
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
          return 0
      }
    })

    return filtered
  }, [songs, searchQuery, filterBy, sortBy, favorites, history])

  // Toggle favorite
  const toggleFavorite = useCallback(
    (songId: string) => {
      const newFavorites = new Set(favorites)
      if (newFavorites.has(songId)) {
        newFavorites.delete(songId)
      } else {
        newFavorites.add(songId)
      }
      setFavorites(newFavorites)
      storage.setFavorites(Array.from(newFavorites))
    },
    [favorites]
  )

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
        <List dense disablePadding>
          {filteredSongs.map((song) => (
            <ListItem key={song.id} disablePadding>
              <ListItemButton
                onClick={() => onSelectSong(song)}
                selected={selectedSongId === song.id}
                sx={{
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
                      width: 56,
                      height: 56,
                      bgcolor: 'rgb(38, 38, 38)',
                    }}
                  >
                    <PlayArrowIcon sx={{ color: 'rgb(163, 163, 163)' }} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="body1" sx={{ color: 'rgb(250, 250, 250)', fontWeight: 500 }}>
                        {song.title}
                      </Typography>
                      {song.trending && (
                        <TrendingUpIcon sx={{ fontSize: '1rem', color: 'rgb(59, 130, 246)' }} />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography component="span" variant="body2" sx={{ color: 'rgb(163, 163, 163)', mb: 0.5, display: 'block' }}>
                        {song.titleTransliteration}
                      </Typography>
                      <Typography component="span" variant="caption" sx={{ color: 'rgb(163, 163, 163)', display: 'block' }}>
                        {song.artist.name}
                      </Typography>
                    </Box>
                  }
                />
                
                {/* Additional info outside ListItemText to avoid hydration issues */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5, ml: 9 }}>
                  {song.hasVideo && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <ThumbUpIcon sx={{ fontSize: '0.8rem', color: 'rgb(163, 163, 163)' }} />
                      <Typography component="span" variant="caption" sx={{ color: 'rgb(163, 163, 163)' }}>
                        {formatNumber(song.youtubeLikes)}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <VisibilityIcon sx={{ fontSize: '0.8rem', color: 'rgb(163, 163, 163)' }} />
                    <Typography component="span" variant="caption" sx={{ color: 'rgb(163, 163, 163)' }}>
                      {formatNumber(song.viewCount)}
                    </Typography>
                  </Box>
                  <Chip
                    label={song.language}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      borderColor: 'rgb(64, 64, 64)',
                      color: 'rgb(163, 163, 163)',
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Tooltip title={favorites.has(song.id) ? 'Remove from favorites' : 'Add to favorites'}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(song.id)
                      }}
                      sx={{ color: favorites.has(song.id) ? 'rgb(255, 193, 7)' : 'rgb(163, 163, 163)' }}
                    >
                      {favorites.has(song.id) ? <StarIcon /> : <StarBorderIcon />}
                    </IconButton>
                  </Tooltip>
                </Box>
              </ListItemButton>
            </ListItem>
          ))}
        </List>

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