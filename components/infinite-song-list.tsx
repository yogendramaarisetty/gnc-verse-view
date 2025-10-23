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
  onToggleFavorite?: (songId: string) => void
  isFavorite?: (songId: string) => boolean
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
}: InfiniteSongListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'views' | 'trending'>('title')
  const [filterBy, setFilterBy] = useState<string>('all')
  const observerTarget = useRef<HTMLDivElement>(null)

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
    // First deduplicate songs by ID to prevent duplicates
    const uniqueSongs = songs.filter((song, index, self) => 
      index === self.findIndex(s => s.id === song.id)
    )
    
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
  }, [songs, searchQuery, viewMode, sortBy, isFavorite, history])


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
          </Box>
        ) : (
          <List dense disablePadding>
            {filteredSongs.map((song) => (
            <ListItem 
              key={song.id} 
              disablePadding
              secondaryAction={
                onToggleFavorite && isFavorite ? (
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleFavorite(song.id)
                    }}
                    sx={{ 
                      color: isFavorite(song.id) ? "rgb(234, 179, 8)" : "rgb(163, 163, 163)",
                      mr: 0.5
                    }}
                  >
                    {isFavorite(song.id) ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                  </IconButton>
                ) : null
              }
            >
              <ListItemButton
                onClick={() => onSelectSong(song)}
                selected={selectedSongId === song.id}
                sx={{
                  py: 0.5,
                  px: 1,
                  minHeight: 48,
                  pr: onToggleFavorite ? 5 : 1, // Add padding for favorite button
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
                      width: 40,
                      height: 40,
                      bgcolor: 'rgb(38, 38, 38)',
                      borderRadius: 1, // Square corners
                    }}
                  >
                    <PlayArrowIcon sx={{ color: 'rgb(163, 163, 163)', fontSize: 16 }} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ color: 'rgb(250, 250, 250)', fontWeight: 500, fontSize: '0.875rem' }}>
                      {song.titleTransliteration ? `${song.title} | ${song.titleTransliteration}` : song.title}
                      {song.trending && (
                        <TrendingUpIcon sx={{ fontSize: '0.875rem', color: 'rgb(59, 130, 246)', ml: 0.5, verticalAlign: 'middle' }} />
                      )}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ color: 'rgb(163, 163, 163)', fontSize: '0.7rem' }}>
                      {song.artist.name} • {formatNumber(song.viewCount)} views
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
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