"use client"

import { useEffect, useRef, useCallback } from "react"
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
  Stack,
} from "@mui/material"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import ThumbUpIcon from "@mui/icons-material/ThumbUp"
import VisibilityIcon from "@mui/icons-material/Visibility"
import type { Song } from "@/lib/types"
import { useInfiniteSongs } from "@/lib/hooks/useSongs"

interface InfiniteSongListProps {
  language: string
  onSelectSong: (song: Song) => void
  selectedSongId?: string
}

export function InfiniteSongList({ 
  language, 
  onSelectSong, 
  selectedSongId 
}: InfiniteSongListProps) {
  const {
    songs,
    loading,
    loadingMore,
    error,
    hasMore,
    totalCount,
    loadMore,
    reset,
  } = useInfiniteSongs()

  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  // Reset when language changes
  useEffect(() => {
    reset(language)
  }, [language, reset])

  // Set up intersection observer for infinite scroll
  const lastSongElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingMore) return
    if (observerRef.current) observerRef.current.disconnect()
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore()
      }
    })
    
    if (node) observerRef.current.observe(node)
  }, [loadingMore, hasMore, loadMore])

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress sx={{ color: "rgb(59, 130, 246)" }} />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    )
  }

  return (
    <Box sx={{ height: "100%", overflow: "auto" }}>
      <Box sx={{ p: 2, borderBottom: "1px solid rgb(38, 38, 38)" }}>
        <Typography variant="h6" sx={{ color: "rgb(250, 250, 250)", mb: 1 }}>
          All {language} Songs
        </Typography>
        <Typography variant="body2" sx={{ color: "rgb(163, 163, 163)" }}>
          {songs.length} of {totalCount} songs loaded
        </Typography>
      </Box>

      <List dense disablePadding>
        {songs.map((song, index) => (
          <ListItem key={song.id} disablePadding>
            <ListItemButton
              selected={selectedSongId === song.id}
              onClick={() => onSelectSong(song)}
              ref={index === songs.length - 1 ? lastSongElementRef : null}
              sx={{
                "&.Mui-selected": {
                  bgcolor: "rgb(38, 38, 38)",
                  borderLeft: "3px solid rgb(59, 130, 246)",
                },
                "&:hover": {
                  bgcolor: "rgb(30, 30, 30)",
                },
              }}
            >
              <ListItemAvatar>
                <Avatar
                  src={song.thumbnail}
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: "rgb(38, 38, 38)",
                  }}
                >
                  <PlayArrowIcon sx={{ color: "rgb(163, 163, 163)" }} />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <Typography variant="body2" sx={{ color: "rgb(250, 250, 250)", fontWeight: 500 }}>
                      {song.title}
                    </Typography>
                    <Chip
                      label={song.originalKey}
                      size="small"
                      variant="outlined"
                      sx={{
                        height: 18,
                        fontSize: "0.65rem",
                        bgcolor: "rgba(59, 130, 246, 0.05)",
                        borderColor: "rgb(59, 130, 246)",
                        color: "rgb(59, 130, 246)",
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                }
                secondary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)", fontSize: "0.75rem" }}>
                      {song.artist.name}
                    </Typography>
                    <Typography component="span" variant="caption" sx={{ color: "rgb(163, 163, 163)", fontSize: "0.75rem", display: "inline-block", mx: 0.5 }}>
                      •
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)", fontSize: "0.75rem" }}>
                      {song.language}
                    </Typography>
                    {song.hasVideo && (
                      <>
                        <Typography component="span" variant="caption" sx={{ color: "rgb(163, 163, 163)", fontSize: "0.75rem", display: "inline-block", mx: 0.5 }}>
                          •
                        </Typography>
                        <ThumbUpIcon sx={{ fontSize: "0.7rem", color: "rgb(163, 163, 163)", verticalAlign: "middle", mr: 0.25 }} />
                        <Typography component="span" variant="caption" sx={{ color: "rgb(163, 163, 163)", fontSize: "0.7rem", mr: 1 }}>
                          {formatNumber(song.youtubeLikes)}
                        </Typography>
                      </>
                    )}
                    <VisibilityIcon sx={{ fontSize: "0.7rem", color: "rgb(163, 163, 163)", verticalAlign: "middle", mr: 0.25 }} />
                    <Typography component="span" variant="caption" sx={{ color: "rgb(163, 163, 163)", fontSize: "0.7rem" }}>
                      {formatNumber(song.viewCount)}
                    </Typography>
                  </Stack>
                }
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {loadingMore && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={24} sx={{ color: "rgb(59, 130, 246)" }} />
        </Box>
      )}

      {!hasMore && songs.length > 0 && (
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)" }}>
            No more songs to load
          </Typography>
        </Box>
      )}
    </Box>
  )
}
