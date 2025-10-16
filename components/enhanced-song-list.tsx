"use client"

import type React from "react"

import { useState, useMemo, useEffect } from "react"
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Chip,
  Stack,
  Typography,
  InputAdornment,
  IconButton,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CardMedia,
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import StarIcon from "@mui/icons-material/Star"
import StarBorderIcon from "@mui/icons-material/StarBorder"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import ThumbUpIcon from "@mui/icons-material/ThumbUp"
import VisibilityIcon from "@mui/icons-material/Visibility"
import TrendingUpIcon from "@mui/icons-material/TrendingUp"
import type { Song } from "@/lib/types"
import type { HistorySong } from "@/lib/api/history"
import { TAGS, MUSICAL_KEYS, ARTISTS } from "@/lib/song-data"
import { storage } from "@/lib/storage"
import type { ViewMode } from "./language-sidebar"

interface EnhancedSongListProps {
  songs: Song[]
  onSelectSong: (song: Song) => void
  selectedSongId?: string
  selectedLanguage: string
  viewMode: ViewMode
  history?: HistorySong[]
}

export function EnhancedSongList({
  songs,
  onSelectSong,
  selectedSongId,
  selectedLanguage,
  viewMode,
  history,
}: EnhancedSongListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState("All")
  const [selectedKey, setSelectedKey] = useState("All")
  const [selectedArtist, setSelectedArtist] = useState("All")
  const [favorites, setFavorites] = useState<string[]>([])
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([])

  useEffect(() => {
    setFavorites(storage.getFavorites())
    setRecentlyViewed(storage.getRecentlyViewed())
  }, [])

  const filteredSongs = useMemo(() => {
    let filtered = songs

    // Apply view mode filters
    if (viewMode === "trending") {
      filtered = filtered.filter((s) => s.trending)
    } else if (viewMode === "favorites") {
      filtered = filtered.filter((s) => favorites.includes(s.id))
    } else if (viewMode === "recent") {
      // Use database history if available, otherwise fall back to localStorage
      if (history && history.length > 0) {
        const recentSongs = history.map((historyItem) => 
          songs.find((s) => s.id === historyItem.id)
        ).filter(Boolean) as Song[]
        filtered = recentSongs
      } else {
        // Fallback to localStorage for backward compatibility
        const recentSongs = recentlyViewed.map((id) => songs.find((s) => s.id === id)).filter(Boolean) as Song[]
        filtered = recentSongs
      }
    } else if (viewMode === "all-time-hits") {
      filtered = [...filtered].sort((a, b) => b.youtubeViews - a.youtubeViews).slice(0, 20)
    } else if (viewMode === "all") {
      // Language filter only applies in "all" mode
      filtered = filtered.filter((s) => s.language === selectedLanguage)
    } else if (viewMode === "all-songs") {
      // All songs mode - show all songs for the selected language
      filtered = filtered.filter((s) => s.language === selectedLanguage)
    }

    // Search filter - Apply to all view modes
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (song) =>
          song.title.toLowerCase().includes(searchLower) ||
          song.titleTransliteration?.toLowerCase().includes(searchLower) ||
          song.artist.name.toLowerCase().includes(searchLower) ||
          song.lyrics.some((line) => line.toLowerCase().includes(searchLower)),
      )
    }

    // Tag filter
    if (selectedTag !== "All") {
      filtered = filtered.filter((s) => s.tags.includes(selectedTag))
    }

    // Key filter
    if (selectedKey !== "All") {
      filtered = filtered.filter((s) => s.originalKey === selectedKey)
    }

    // Artist filter
    if (selectedArtist !== "All") {
      filtered = filtered.filter((s) => s.artist.id === selectedArtist)
    }

    return filtered
  }, [
    songs,
    searchQuery,
    selectedTag,
    selectedKey,
    selectedArtist,
    favorites,
    recentlyViewed,
    history,
    viewMode,
    selectedLanguage,
  ])

  const handleToggleFavorite = (songId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    storage.toggleFavorite(songId)
    setFavorites(storage.getFavorites())
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const getSearchPlaceholder = (): string => {
    switch (viewMode) {
      case "recent":
        return "Search Recent Songs"
      case "favorites":
        return "Search Favorites"
      case "trending":
        return "Search Trending Songs"
      case "all-time-hits":
        return "Search All Time Hits"
      case "playlists":
        return "Search Playlists"
      case "all":
        return `Search ${selectedLanguage} Songs`
      default:
        return "Search songs, lyrics, artist..."
    }
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "rgb(20, 20, 20)" }}>
      {/* Search */}
      <Box sx={{ p: 1.5, borderBottom: "1px solid rgb(38, 38, 38)" }}>
        <TextField
          fullWidth
          size="small"
          placeholder={getSearchPlaceholder()}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "rgb(163, 163, 163)", fontSize: "1.2rem" }} />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              bgcolor: "rgb(38, 38, 38)",
              color: "rgb(250, 250, 250)",
              fontSize: "0.875rem",
              "& fieldset": { borderColor: "rgb(38, 38, 38)" },
              "&:hover fieldset": { borderColor: "rgb(59, 130, 246)" },
              "&.Mui-focused fieldset": { borderColor: "rgb(59, 130, 246)" },
            },
          }}
        />
      </Box>

      {/* Filters */}
      <Box sx={{ p: 1.5, borderBottom: "1px solid rgb(38, 38, 38)" }}>
        <Stack spacing={1.5}>
          {/* Tag Filter */}
          <FormControl size="small" fullWidth>
            <InputLabel sx={{ color: "rgb(163, 163, 163)", fontSize: "0.875rem" }}>Category</InputLabel>
            <Select
              value={selectedTag}
              label="Category"
              onChange={(e) => setSelectedTag(e.target.value)}
              sx={{
                bgcolor: "rgb(38, 38, 38)",
                color: "rgb(250, 250, 250)",
                fontSize: "0.875rem",
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgb(38, 38, 38)" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgb(59, 130, 246)" },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "rgb(59, 130, 246)" },
              }}
            >
              <MenuItem value="All">All Categories</MenuItem>
              {TAGS.map((tag) => (
                <MenuItem key={tag} value={tag}>
                  {tag}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: "flex", gap: 1 }}>
            {/* Key Filter */}
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel sx={{ color: "rgb(163, 163, 163)", fontSize: "0.875rem" }}>Scale</InputLabel>
              <Select
                value={selectedKey}
                label="Scale"
                onChange={(e) => setSelectedKey(e.target.value)}
                sx={{
                  bgcolor: "rgb(38, 38, 38)",
                  color: "rgb(250, 250, 250)",
                  fontSize: "0.875rem",
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgb(38, 38, 38)" },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgb(59, 130, 246)" },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "rgb(59, 130, 246)" },
                }}
              >
                <MenuItem value="All">All Scales</MenuItem>
                {MUSICAL_KEYS.map((key) => (
                  <MenuItem key={key} value={key}>
                    {key}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Artist Filter */}
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel sx={{ color: "rgb(163, 163, 163)", fontSize: "0.875rem" }}>Artist</InputLabel>
              <Select
                value={selectedArtist}
                label="Artist"
                onChange={(e) => setSelectedArtist(e.target.value)}
                sx={{
                  bgcolor: "rgb(38, 38, 38)",
                  color: "rgb(250, 250, 250)",
                  fontSize: "0.875rem",
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgb(38, 38, 38)" },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgb(59, 130, 246)" },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "rgb(59, 130, 246)" },
                }}
              >
                <MenuItem value="All">All Artists</MenuItem>
                {ARTISTS.map((artist) => (
                  <MenuItem key={artist.id} value={artist.id}>
                    {artist.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Stack>
      </Box>

      {/* Song List */}
      <Box sx={{ flex: 1, overflow: "auto" }}>
        <List dense disablePadding>
          {filteredSongs.map((song, index) => (
            <Box key={song.id}>
              <ListItem
                disablePadding
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(e) => handleToggleFavorite(song.id, e)}
                    sx={{ color: favorites.includes(song.id) ? "rgb(234, 179, 8)" : "rgb(163, 163, 163)" }}
                  >
                    {favorites.includes(song.id) ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                  </IconButton>
                }
              >
                <ListItemButton
                  selected={selectedSongId === song.id}
                  onClick={() => onSelectSong(song)}
                  sx={{
                    py: 0.5,
                    px: 1,
                    minHeight: 48,
                    display: "flex",
                    gap: 1,
                    "&.Mui-selected": {
                      bgcolor: "rgb(38, 38, 38)",
                      borderLeft: "3px solid rgb(59, 130, 246)",
                    },
                    "&:hover": {
                      bgcolor: "rgb(30, 30, 30)",
                    },
                  }}
                >
                  <CardMedia
                    component="img"
                    image={song.thumbnail}
                    alt={song.title}
                    sx={{
                      width: 40,
                      height: 32,
                      borderRadius: 1,
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                  <ListItemText
                    primary={
                      <>
                        <Typography component="span" variant="body2" sx={{ color: "rgb(250, 250, 250)", fontWeight: 500 }}>
                          {song.title}
                        </Typography>
                        {song.trending && <TrendingUpIcon sx={{ fontSize: "0.9rem", color: "rgb(239, 68, 68)", verticalAlign: "middle", ml: 0.5 }} />}
                      </>
                    }
                    secondary={
                      <>
                        {song.titleTransliteration && (
                          <>
                            <Typography component="span" variant="caption" sx={{ color: "rgb(163, 163, 163)", fontSize: "0.75rem", display: "block", mb: 0.25 }}>
                              {song.titleTransliteration}
                            </Typography>
                          </>
                        )}
                        <Typography component="span" variant="caption" sx={{ color: "rgb(163, 163, 163)", fontSize: "0.75rem", display: "inline-block", mr: 0.5 }}>
                          {song.artist.name}
                        </Typography>
                        <Typography component="span" variant="caption" sx={{ color: "rgb(163, 163, 163)", fontSize: "0.75rem", display: "inline-block", mx: 0.5 }}>
                          •
                        </Typography>
                        <Chip
                          label={song.originalKey}
                          size="small"
                          variant="outlined"
                          component="span"
                          sx={{
                            height: "16px",
                            fontSize: "0.65rem",
                            bgcolor: "rgba(59, 130, 246, 0.05)",
                            borderColor: "rgb(59, 130, 246)",
                            color: "rgb(59, 130, 246)",
                            fontWeight: 600,
                            "& .MuiChip-label": { px: 0.75 },
                            display: "inline-flex",
                            verticalAlign: "middle",
                          }}
                        />
                        <br />
                        {song.hasVideo && (
                          <>
                            <PlayArrowIcon sx={{ fontSize: "0.75rem", color: "rgb(163, 163, 163)", verticalAlign: "middle", mr: 0.25 }} />
                            <Typography component="span" variant="caption" sx={{ color: "rgb(163, 163, 163)", fontSize: "0.7rem", mr: 1 }}>
                              {formatNumber(song.youtubeViews)}
                            </Typography>
                          </>
                        )}
                        <ThumbUpIcon sx={{ fontSize: "0.7rem", color: "rgb(163, 163, 163)", verticalAlign: "middle", mr: 0.25 }} />
                        <Typography component="span" variant="caption" sx={{ color: "rgb(163, 163, 163)", fontSize: "0.7rem", mr: 1 }}>
                          {formatNumber(song.youtubeLikes)}
                        </Typography>
                        <VisibilityIcon sx={{ fontSize: "0.7rem", color: "rgb(163, 163, 163)", verticalAlign: "middle", mr: 0.25 }} />
                        <Typography component="span" variant="caption" sx={{ color: "rgb(163, 163, 163)", fontSize: "0.7rem" }}>
                          {formatNumber(song.viewCount)}
                        </Typography>
                      </>
                    }
                  />
                </ListItemButton>
              </ListItem>
              {index < filteredSongs.length - 1 && <Divider sx={{ borderColor: "rgb(38, 38, 38)" }} />}
            </Box>
          ))}
        </List>

        {filteredSongs.length === 0 && (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "rgb(163, 163, 163)" }}>
              No songs found
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
