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
import { useBackendSearch } from "@/lib/hooks/useBackendSearch"
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
  
  // Use backend search
  const {
    query,
    results,
    loading,
    error,
    search,
    clearSearch,
    clearBackendCache,
    getCacheStats,
    hasResults,
    isEmpty,
    getSearchStats,
    getTopResults,
    getMatchQuality,
    getSearchInsights,
    isPerfectMatch,
    cacheStats,
    isBackendLoading
  } = useBackendSearch({
    language,
    debounceMs: 300,
    minQueryLength: 1,
    maxResults: 15
  })

  // Handle search input with optimization
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setSearchQuery(value)
    
    // Only trigger search if value has actually changed
    if (value !== query) {
      search(value)
    }
  }, [search, query])

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

  // Handle cache clear
  const handleClearCache = useCallback(async () => {
    await clearBackendCache()
    // Optionally show a success message
  }, [clearBackendCache])

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
    console.log('Search Results Debug:', {
      hasResults,
      resultsCount: results.length,
      loading,
      query,
      firstResult: results[0]
    })
  }, [hasResults, results, loading, query])

  // Optimize loading state to prevent flicker
  const [showLoading, setShowLoading] = useState(false)
  useEffect(() => {
    if (loading) {
      setShowLoading(true)
    } else {
      // Delay hiding loading to prevent flicker, but only if we have results or no query
      const timer = setTimeout(() => {
        setShowLoading(false)
      }, loading ? 0 : 150) // Show loading immediately, hide with delay
      return () => clearTimeout(timer)
    }
  }, [loading])

  // Show loading when we have a query but no results yet
  const shouldShowLoading = showLoading || (query.trim().length > 0 && !hasResults && !error && loading)
  
  // Show loading state with better conditions - show loading during debounce and API call
  const isLoading = loading || (query.trim().length > 0 && !hasResults && !error)
  
  // Show linear loader when backend is loading
  const showLinearLoader = isBackendLoading || (loading && hasResults)

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
            // Linear loader overlay
            ...(showLinearLoader && {
              "&::after": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "2px",
                background: "linear-gradient(90deg, transparent, rgb(59, 130, 246), transparent)",
                animation: "loading-shimmer 1.5s infinite",
                zIndex: 1,
              },
            }),
          },
          "& .MuiInputBase-input": {
            color: "rgb(250, 250, 250)",
            "&::placeholder": {
              color: "rgb(163, 163, 163)",
            },
          },
          // Keyframes for loading animation
          ...(showLinearLoader && {
            "@keyframes loading-shimmer": {
              "0%": {
                transform: "translateX(-100%)",
              },
              "100%": {
                transform: "translateX(100%)",
              },
            },
          }),
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
            // Keyframes for loading animation
            "@keyframes loading-shimmer": {
              "0%": {
                transform: "translateX(-100%)",
              },
              "100%": {
                transform: "translateX(100%)",
              },
            },
          }}
        >
          {isLoading && (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", p: 3 }}>
              <Box sx={{ 
                width: "100%", 
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
                {loading ? `Searching for "${query}"...` : `Preparing search for "${query}"...`}
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
                    <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)" }}>
                      Found {results.length} results
                    </Typography>
                    {isPerfectMatch && (
                      <Chip
                        label="Perfect Match"
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ height: 18, fontSize: "0.65rem" }}
                      />
                    )}
                    {cacheStats?.cached && (
                      <Chip
                        label="Cached"
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ height: 18, fontSize: "0.65rem" }}
                      />
                    )}
                    {showLinearLoader && (
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
                    {showLinearLoader && ' • Reordering by relevance...'}
                  </Typography>
                </Box>
              )}

              {/* Search Results */}
              {hasResults && (
                <List dense disablePadding>
                  {getTopResults(10)
                    .filter(result => result && (result as any).song)
                    .map((result, index) => {
                      // Backend search returns BackendSearchResult objects
                      const song = (result as any).song
                      
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
                                dangerouslySetInnerHTML={{ 
                                  __html: (result as any).song?.titleTransliteration 
                                    ? `${(result as any).highlights?.title || (result as any).song?.title || 'Unknown Title'} | ${(result as any).song.titleTransliteration}`
                                    : (result as any).highlights?.title || (result as any).song?.title || 'Unknown Title'
                                }}
                              />
                              <Chip
                                label={getMatchQuality((result as any).score).label}
                                size="small"
                                color={getMatchQuality((result as any).score).color as any}
                                variant="outlined"
                                sx={{
                                  height: 18,
                                  fontSize: "0.65rem",
                                  fontWeight: 600,
                                }}
                              />
                              {(result as any).song?.trending && (
                                <TrendingUpIcon sx={{ fontSize: "0.8rem", color: "rgb(59, 130, 246)" }} />
                              )}
                            </Box>
                          }
                          secondary={
                            <Typography 
                              component="span"
                              variant="caption" 
                              sx={{ color: "rgb(163, 163, 163)" }}
                              dangerouslySetInnerHTML={{ 
                                __html: `${(result as any).highlights?.artist || (result as any).song?.artist?.name || 'Unknown Artist'} • ${formatNumber((result as any).song?.viewCount || 0)} views`
                              }}
                            />
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