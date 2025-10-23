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
  LinearProgress,
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import ClearIcon from "@mui/icons-material/Clear"
import HistoryIcon from "@mui/icons-material/History"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import ThumbUpIcon from "@mui/icons-material/ThumbUp"
import VisibilityIcon from "@mui/icons-material/Visibility"
import TrendingUpIcon from "@mui/icons-material/TrendingUp"
import type { Song } from "@/lib/types"
import { useHybridSearch } from "@/lib/hooks/useHybridSearch"
import { CacheStatus } from "./cache-status"
import { EnhancedCacheStatus } from "./enhanced-cache-status"
import { SupabaseLogs } from "./supabase-logs"

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
  
  // Use hybrid search for ultra-fast results
  const {
    query,
    results,
    loading,
    error,
    search,
    clearSearch,
    hasResults,
    isEmpty,
    isSearching,
    getSearchStats,
    getTopResults,
    getMatchQuality,
    getSearchInsights
  } = useHybridSearch({
    language,
    maxResults: 15,
    enableServerFallback: true,
    serverDebounceMs: 100
  })

  // Handle search input with instant search (no debounce for client-side)
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setSearchQuery(value)
    
    // Instant search - no debounce needed for client-side results
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

  // Handle cache clear (no longer needed with in-memory search)
  const handleClearCache = useCallback(async () => {
    // Cache is automatically managed by the search engine
  }, [])

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
    setShowDropdown(isFocused || hasResults)
  }, [isFocused, hasResults])

  // Debug logging for results
  useEffect(() => {
    // Debug logging removed for production
  }, [hasResults, results, loading, query])

  // Show loading state when any search is in progress
  const isLoading = isSearching

  // Track loading state changes
  useEffect(() => {
    // Loading state tracking removed for production
  }, [isLoading, isSearching])

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }


  return (
    <Box ref={searchRef} sx={{ position: "relative", width: "100%", minWidth: { xs: 200, sm: 300 } }}>
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
            position: "relative",
            "& fieldset": {
              borderColor: "rgb(64, 64, 64)",
            },
            "&:hover fieldset": {
              borderColor: "rgb(82, 82, 82)",
            },
            "&.Mui-focused fieldset": {
              borderColor: "rgb(59, 130, 246)",
            },
            // No linear loader overlay needed - using solid loader on results
          },
          "& .MuiInputBase-input": {
            color: "rgb(250, 250, 250)",
            "&::placeholder": {
              color: "rgb(163, 163, 163)",
            },
          },
          // No keyframes needed - using solid loader on results
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
            maxHeight: 500,
            minWidth: { xs: 300, sm: 400, md: 500, lg: 600 },
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
            // Keyframes for loading animations
            "@keyframes spin": {
              "0%": {
                transform: "rotate(0deg)",
              },
              "100%": {
                transform: "rotate(360deg)",
              },
            },
          }}
        >
          {isLoading && (
            <Box sx={{ 
              bgcolor: "rgb(30, 30, 30)",
              py: 1,
              px: 2
            }}>
              <LinearProgress 
                sx={{
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: 'rgb(156, 39, 176)', // Purple color
                  },
                  '& .MuiLinearProgress-root': {
                    backgroundColor: 'rgb(64, 64, 64)', // Dark background
                  },
                  height: 4,
                  borderRadius: 2,
                  mb: 1
                }}
              />
              <Typography variant="body2" sx={{ color: "rgb(163, 163, 163)", textAlign: "center" }}>
                Searching for "{query}"...
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ m: 1 }}>
              {error}
            </Alert>
          )}

          {!isLoading && !error && (
            <>
              {/* Search Stats */}
              {hasResults && (
                <Box sx={{ px: 2, py: 1, borderBottom: "1px solid rgb(38, 38, 38)" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    {results.length > 0 && results[0].score >= 1000 && (
                      <Chip
                        label="Perfect Match"
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ height: 18, fontSize: "0.65rem" }}
                      />
                    )}
                    {results.some(r => r.source === 'client') && (
                      <Chip
                        label="Instant"
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ height: 18, fontSize: "0.65rem" }}
                      />
                    )}
                    {isSearching && hasResults && (
                      <Chip
                        label="Updating..."
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ height: 18, fontSize: "0.65rem" }}
                      />
                    )}
                  </Box>
                  <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)" }}>
                    {getSearchInsights().join(' • ')}
                    {isSearching && hasResults && ' • Reordering by relevance...'}
                  </Typography>
                </Box>
              )}

              {/* Search Results */}
              {hasResults && (
                <List dense disablePadding>
                  {getTopResults(10)
                    .filter(result => result && result.song)
                    .map((result, index) => {
                      // Hybrid search returns HybridSearchResult objects
                      const song = result.song
                      
                      return (
                    <ListItem key={song?.id || `result-${index}`} disablePadding>
                      <ListItemButton
                        onClick={() => song && handleSelectSong(song)}
                        sx={{
                          py: 1.5,
                          px: 2,
                          "&:hover": {
                            bgcolor: "rgb(30, 30, 30)",
                          },
                        }}
                      >
                        <ListItemAvatar>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 1,
                              bgcolor: "rgb(38, 38, 38)",
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                              overflow: 'hidden',
                              backgroundImage: song?.thumbnail ? `url(${song.thumbnail})` : 'none',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              '&:hover': {
                                opacity: 0.8,
                              }
                            }}
                          >
                            {/* Fallback icon when no thumbnail or image fails to load */}
                            <PlayArrowIcon 
                              sx={{ 
                                color: "rgb(163, 163, 163)", 
                                fontSize: 20,
                                display: song?.thumbnail ? 'none' : 'block'
                              }} 
                            />
                          </Box>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                              <Typography 
                                variant="body2" 
                                sx={{ color: "rgb(250, 250, 250)", fontWeight: 500 }}
                              >
                                {song?.titleTransliteration 
                                  ? `${song?.title || 'Unknown Title'} | ${song.titleTransliteration}`
                                  : song?.title || 'Unknown Title'
                                }
                              </Typography>
                              <Chip
                                label={getMatchQuality(result.score).label}
                                size="small"
                                color={getMatchQuality(result.score).color as any}
                                variant="outlined"
                                sx={{
                                  height: 18,
                                  fontSize: "0.65rem",
                                  fontWeight: 600,
                                }}
                              />
                              {result.source === 'client' && (
                                <Chip
                                  label="Instant"
                                  size="small"
                                  color="info"
                                  variant="outlined"
                                  sx={{ height: 18, fontSize: "0.65rem" }}
                                />
                              )}
                              {song?.trending && (
                                <TrendingUpIcon sx={{ fontSize: "0.8rem", color: "rgb(59, 130, 246)" }} />
                              )}
                            </Box>
                          }
                          secondary={
                            <Typography 
                              component="span"
                              variant="caption" 
                              sx={{ color: "rgb(163, 163, 163)" }}
                            >
                              {song?.artist?.name || 'Unknown Artist'} • {formatNumber(song?.viewCount || 0)} views
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                      )
                    })}
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

              {/* Cache Management */}
              {hasResults && (
                <>
                  <Divider />
                  <Box sx={{ px: 2, py: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)", fontWeight: 600 }}>
                      Cache Management
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={handleClearCache}
                      sx={{ color: "rgb(163, 163, 163)" }}
                      title="Clear search cache"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </>
              )}

              {/* Enhanced Cache Status (Development) */}
              {process.env.NODE_ENV === 'development' && (
                <EnhancedCacheStatus showDetails={true} compact={false} />
              )}

              {/* Supabase Logs (Development) */}
              {process.env.NODE_ENV === 'development' && (
                <Box sx={{ px: 2, py: 1, borderTop: "1px solid rgb(38, 38, 38)" }}>
                  <SupabaseLogs showDetails={false} />
                </Box>
              )}
            </>
          )}
        </Paper>
      )}
    </Box>
  )
}