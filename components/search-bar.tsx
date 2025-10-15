"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Box,
  TextField,
  InputAdornment,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Chip,
  CircularProgress,
  Divider,
  Tooltip,
  Alert,
  IconButton,
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import ClearIcon from "@mui/icons-material/Clear"
import HistoryIcon from "@mui/icons-material/History"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import ThumbUpIcon from "@mui/icons-material/ThumbUp"
import VisibilityIcon from "@mui/icons-material/Visibility"
import StarIcon from "@mui/icons-material/Star"
import TrendingUpIcon from "@mui/icons-material/TrendingUp"
import type { Song } from "@/lib/types"
import { useFuzzySearch } from "@/lib/hooks/useFuzzySearch"
import { CacheStatus } from "./cache-status"

interface SearchBarProps {
  onSelectSong: (song: Song) => void
  songs?: Song[]
  language?: string
}

export function SearchBar({ onSelectSong, songs = [], language }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  
  const {
    query,
    results,
    suggestions,
    loading,
    error,
    search,
    clearSearch,
    hasResults,
    isEmpty,
    getSearchStats,
    getTopResults
  } = useFuzzySearch({
    songs,
    language,
    debounceMs: 300,
    minQueryLength: 1
  })

  // Handle search input
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setSearchQuery(value)
    search(value)
  }, [search])

  // Handle search clear
  const handleClearSearch = useCallback(() => {
    setSearchQuery("")
    clearSearch()
  }, [clearSearch])

  // Handle song selection
  const handleSelectSong = useCallback((song: Song) => {
    onSelectSong(song)
    setShowDropdown(false)
    setSearchQuery("")
    clearSearch()
  }, [onSelectSong, clearSearch])

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setSearchQuery(suggestion)
    search(suggestion)
  }, [search])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Show dropdown when focused or has results
  useEffect(() => {
    setShowDropdown(isFocused || hasResults || suggestions.length > 0)
  }, [isFocused, hasResults, suggestions.length])

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "success"
    if (score >= 60) return "warning"
    return "default"
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent Match"
    if (score >= 60) return "Good Match"
    if (score >= 40) return "Fair Match"
    return "Partial Match"
  }

  return (
    <Box ref={searchRef} sx={{ position: "relative", width: "100%" }}>
      <TextField
        fullWidth
        placeholder="Search songs, artists, lyrics..."
        value={searchQuery}
        onChange={handleSearchChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: "rgb(163, 163, 163)" }} />
            </InputAdornment>
          ),
          endAdornment: searchQuery && (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={handleClearSearch}
                sx={{ color: "rgb(163, 163, 163)" }}
              >
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            bgcolor: "rgb(25, 25, 25)",
            "& fieldset": {
              borderColor: "rgb(64, 64, 64)",
            },
            "&:hover fieldset": {
              borderColor: "rgb(82, 82, 82)",
            },
            "&.Mui-focused fieldset": {
              borderColor: "rgb(59, 130, 246)",
            },
          },
          "& .MuiInputBase-input": {
            color: "rgb(250, 250, 250)",
            "&::placeholder": {
              color: "rgb(163, 163, 163)",
            },
          },
        }}
      />

      {/* Search Dropdown */}
      {showDropdown && (
        <Paper
          sx={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 1000,
            bgcolor: "rgb(25, 25, 25)",
            border: "1px solid rgb(38, 38, 38)",
            borderRadius: 1,
            mt: 0.5,
            maxHeight: 400,
            overflow: "auto",
            "&::-webkit-scrollbar": {
              width: 6,
            },
            "&::-webkit-scrollbar-track": {
              bgcolor: "rgb(38, 38, 38)",
            },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "rgb(64, 64, 64)",
              borderRadius: 3,
            },
          }}
        >
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
              <CircularProgress size={24} sx={{ color: "rgb(59, 130, 246)" }} />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ m: 1 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && (
            <>
              {/* Search Stats */}
              {hasResults && (
                <Box sx={{ px: 2, py: 1, borderBottom: "1px solid rgb(38, 38, 38)" }}>
                  <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)" }}>
                    Found {results.length} results
                    {getSearchStats().averageScore > 0 && (
                      <span> • Avg relevance: {getSearchStats().averageScore.toFixed(1)}%</span>
                    )}
                  </Typography>
                </Box>
              )}

              {/* Search Results */}
              {hasResults && (
                <List dense disablePadding>
                  {getTopResults(10).map((result, index) => (
                    <ListItem key={result.song.id} disablePadding>
                      <ListItemButton
                        onClick={() => handleSelectSong(result.song)}
                        sx={{
                          "&:hover": {
                            bgcolor: "rgb(30, 30, 30)",
                          },
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar
                            src={result.song.thumbnail}
                            sx={{
                              width: 40,
                              height: 40,
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
                                {result.song.title}
                              </Typography>
                              <Chip
                                label={`${result.score.toFixed(0)}%`}
                                size="small"
                                color={getScoreColor(result.score) as any}
                                variant="outlined"
                                sx={{
                                  height: 18,
                                  fontSize: "0.65rem",
                                  fontWeight: 600,
                                }}
                              />
                              {result.song.trending && (
                                <TrendingUpIcon sx={{ fontSize: "0.8rem", color: "rgb(59, 130, 246)" }} />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)" }}>
                                {result.song.artist.name}
                              </Typography>
                              <Typography component="span" variant="caption" sx={{ color: "rgb(163, 163, 163)" }}>
                                •
                              </Typography>
                              <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)" }}>
                                {result.song.language}
                              </Typography>
                              {result.song.hasVideo && (
                                <>
                                  <Typography component="span" variant="caption" sx={{ color: "rgb(163, 163, 163)" }}>
                                    •
                                  </Typography>
                                  <ThumbUpIcon sx={{ fontSize: "0.7rem", color: "rgb(163, 163, 163)" }} />
                                  <Typography component="span" variant="caption" sx={{ color: "rgb(163, 163, 163)" }}>
                                    {formatNumber(result.song.youtubeLikes)}
                                  </Typography>
                                </>
                              )}
                              <Typography component="span" variant="caption" sx={{ color: "rgb(163, 163, 163)" }}>
                                •
                              </Typography>
                              <VisibilityIcon sx={{ fontSize: "0.7rem", color: "rgb(163, 163, 163)" }} />
                              <Typography component="span" variant="caption" sx={{ color: "rgb(163, 163, 163)" }}>
                                {formatNumber(result.song.viewCount)}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}

              {/* No Results */}
              {isEmpty && (
                <Box sx={{ p: 2, textAlign: "center" }}>
                  <Typography variant="body2" sx={{ color: "rgb(163, 163, 163)" }}>
                    No songs found for "{searchQuery}"
                  </Typography>
                  <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)", mt: 1, display: "block" }}>
                    Try different keywords or check spelling
                  </Typography>
                </Box>
              )}

              {/* Search Suggestions */}
              {suggestions.length > 0 && !hasResults && (
                <>
                  <Divider />
                  <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)", fontWeight: 600 }}>
                      Suggestions
                    </Typography>
                  </Box>
                  <List dense disablePadding>
                    {suggestions.map((suggestion, index) => (
                      <ListItem key={index} disablePadding>
                        <ListItemButton
                          onClick={() => handleSuggestionClick(suggestion)}
                          sx={{
                            "&:hover": {
                              bgcolor: "rgb(30, 30, 30)",
                            },
                          }}
                        >
                          <ListItemText
                            primary={
                              <Typography variant="body2" sx={{ color: "rgb(250, 250, 250)" }}>
                                {suggestion}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </>
              )}

              {/* Cache Status (Development) */}
              {process.env.NODE_ENV === 'development' && (
                <Box sx={{ px: 2, py: 1, borderTop: "1px solid rgb(38, 38, 38)" }}>
                  <CacheStatus showDetails={false} />
                </Box>
              )}
            </>
          )}
        </Paper>
      )}
    </Box>
  )
}