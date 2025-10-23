"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import {
  Box,
  Typography,
  IconButton,
  Stack,
  Chip,
  Tooltip,
  Divider,
  Button,
  ButtonGroup,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  Select,
  FormControl,
  InputLabel,
  Drawer,
  useMediaQuery,
  useTheme,
  Paper,
} from "@mui/material"
import FavoriteIcon from "@mui/icons-material/Favorite"
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder"
import PresentToAllIcon from "@mui/icons-material/PresentToAll"
import YouTubeIcon from "@mui/icons-material/YouTube"
import AddIcon from "@mui/icons-material/Add"
import RemoveIcon from "@mui/icons-material/Remove"
import MusicNoteIcon from "@mui/icons-material/MusicNote"
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd"
import ThumbUpIcon from "@mui/icons-material/ThumbUp"
import VisibilityIcon from "@mui/icons-material/Visibility"
import TrendingUpIcon from "@mui/icons-material/TrendingUp"
import ExpandLessIcon from "@mui/icons-material/ExpandLess"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft"
import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter"
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight"
import FormatBoldIcon from "@mui/icons-material/FormatBold"
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown"
import SettingsIcon from "@mui/icons-material/Settings"
import CloseIcon from "@mui/icons-material/Close"
import type { Song } from "@/lib/types"
import { storage } from "@/lib/storage"
import { transposeChords } from "@/lib/chord-utils"
import { useAuth } from "@/lib/hooks/useAuth"
import { useRouter } from "next/navigation"

interface SongViewerProps {
  song: Song
  onPresentationMode: () => void
  onFavoritesChange?: () => void
  onPlaylistAdd?: (playlistId: string) => void
  onPlaylistRemove?: (playlistId: string) => void
  playlists?: any[]
  isFavorite?: boolean
}

export function SongViewer({ 
  song, 
  onPresentationMode, 
  onFavoritesChange, 
  onPlaylistAdd, 
  onPlaylistRemove, 
  playlists = [], 
  isFavorite: propIsFavorite 
}: SongViewerProps) {
  const { user } = useAuth()
  const router = useRouter()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [isFavorite, setIsFavorite] = useState(false)
  const [fontSize, setFontSize] = useState(16)
  const [transpose, setTranspose] = useState(0)
  const [showChords, setShowChords] = useState(true)
  const [playlistMenuAnchor, setPlaylistMenuAnchor] = useState<null | HTMLElement>(null)
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(isMobile)
  const [lyricsTab, setLyricsTab] = useState(0) // 0: Telugu, 1: English
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left')
  const [teluguFont, setTeluguFont] = useState('Potta One')
  const [isBold, setIsBold] = useState(false)
  const [mobileOverlayOpen, setMobileOverlayOpen] = useState(false)

  useEffect(() => {
    if (user) {
      // For authenticated users, use the prop value from parent
      setIsFavorite(propIsFavorite ?? false)
    } else {
      // Use local storage for anonymous users
      setIsFavorite(storage.isFavorite(song.id))
    }
    
    // Load saved preferences
    setFontSize(storage.getFontSize())
    setTextAlign(storage.getTextAlign())
    setLyricsTab(storage.getLanguageTab())
    setTeluguFont(storage.getTeluguFont())
    setIsBold(storage.getIsBold())
    setTranspose(0)
  }, [song.id, user, propIsFavorite])

  // Handle mobile/desktop transitions
  useEffect(() => {
    setIsHeaderCollapsed(isMobile)
  }, [isMobile])


  const handleToggleFavorite = async () => {
    if (!user) {
      // Redirect to login if not authenticated
      router.push('/login')
      return
    }
    
    // Let the parent component handle the API call to avoid double toggling
    if (onFavoritesChange) {
      try {
        await onFavoritesChange()
        // Don't update local state - let the parent's prop update handle it
      } catch (error) {
        console.error('Failed to toggle favorite:', error)
        console.warn('Failed to update favorite in database. Please check your connection and try again.')
      }
    } else {
      // Fallback to local storage for anonymous users or if no callback provided
      const newState = storage.toggleFavorite(song.id)
      setIsFavorite(newState)
    }
  }

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(12, Math.min(24, fontSize + delta))
    setFontSize(newSize)
    storage.setFontSize(newSize)
  }

  const handleTextAlignChange = (align: 'left' | 'center' | 'right') => {
    setTextAlign(align)
    storage.setTextAlign(align)
  }

  const handleLanguageChange = (tab: number) => {
    setLyricsTab(tab)
    storage.setLanguageTab(tab)
  }

  const handleTeluguFontChange = (font: string) => {
    console.log('Changing Telugu font to:', font)
    setTeluguFont(font)
    storage.setTeluguFont(font)
  }

  const handleBoldToggle = () => {
    const newBold = !isBold
    setIsBold(newBold)
    storage.setIsBold(newBold)
  }

  const getTeluguFontFamily = () => {
    if (lyricsTab !== 0) return undefined
    
    let fontFamily
    switch (teluguFont) {
      case 'Potta One':
        fontFamily = "'Potta One', sans-serif"
        break
      case 'Noto Sans':
        fontFamily = "'Noto Sans', sans-serif"
        break
      case 'Inter':
        fontFamily = "'Inter', sans-serif"
        break
      default:
        fontFamily = "'Potta One', sans-serif"
    }
    
    console.log('Getting Telugu font family:', fontFamily, 'for font:', teluguFont)
    return fontFamily
  }

  const handleTranspose = (delta: number) => {
    setTranspose((prev) => {
      const newTranspose = prev + delta
      return Math.max(-6, Math.min(6, newTranspose))
    })
  }

  const handleOpenPlaylistMenu = (event: React.MouseEvent<HTMLElement>) => {
    if (!user) {
      // Redirect to login if not authenticated
      router.push('/login')
      return
    }
    setPlaylistMenuAnchor(event.currentTarget)
  }

  const handleClosePlaylistMenu = () => {
    setPlaylistMenuAnchor(null)
  }

  const handleAddToPlaylist = (playlistId: string) => {
    if (onPlaylistAdd) {
      onPlaylistAdd(playlistId)
    } else {
      // Fallback to local storage
      storage.addSongToPlaylist(playlistId, song.id)
    }
    handleClosePlaylistMenu()
  }

  // Use prop playlists if available, otherwise fallback to local storage
  const availablePlaylists = playlists.length > 0 ? playlists : storage.getPlaylists()
  const transposedChords = song.chords ? transposeChords(song.chords, transpose) : []
  
  // Determine which lyrics to show and clean them
  const currentLyrics = useMemo(() => {
    if (lyricsTab === 0) {
      return song.lyrics || []
    } else {
      // Clean English lyrics by filtering out headers
      return (song.englishLyrics || []).filter(line => {
        if (!line || line.trim().length === 0) return false
        
        // Filter out common headers that appear in the data
        const headersToFilter = [
          'Telugu Lyrics',
          'English Lyrics', 
          'Audio',
          'Telugu LyricsEnglish LyricsAudio',
          'Telugu LyricsEnglish Lyrics',
          'English LyricsAudio'
        ]
        
        // Only filter out exact matches, not lines that start with these words
        const isExactHeader = headersToFilter.includes(line.trim())
        
        return !isExactHeader
      })
    }
  }, [lyricsTab, song.englishLyrics, song.lyrics])
  
  const currentChords = song.chords ? transposeChords(song.chords, transpose) : []
  

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "rgb(20, 20, 20)" }}>
      {/* Hero Header with Thumbnail Background */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: isHeaderCollapsed ? { xs: "100px", sm: "120px" } : { xs: "200px", sm: "240px" },
          overflow: "hidden",
          borderBottom: "1px solid rgb(38, 38, 38)",
          transition: "height 0.3s ease",
          cursor: "pointer",
        }}
        onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
      >
        {/* Background Image */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url(${song.thumbnail})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(8px)",
            transform: "scale(1.1)",
          }}
        />

        {/* Radial Gradient Vignette Overlay - Netflix/Prime style */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.8) 100%),
              linear-gradient(to bottom, rgba(20,20,20,0.3) 0%, rgba(20,20,20,0.95) 100%)
            `,
          }}
        />

        {/* Content Overlay */}
        <Box
          sx={{
            position: "relative",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            px: 3,
            pb: 3,
          }}
        >

          {/* Bottom Content */}
          <Box sx={{ position: "relative" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: isHeaderCollapsed ? 0.5 : 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
                <Typography
                  variant={isHeaderCollapsed ? "h5" : "h4"}
                  sx={{
                    color: "white",
                    fontWeight: 700,
                    textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                    fontSize: { 
                      xs: isHeaderCollapsed ? "1.25rem" : "1.5rem", 
                      sm: isHeaderCollapsed ? "1.5rem" : "2rem" 
                    },
                    lineHeight: { xs: 1.2, sm: 1.3 },
                    wordBreak: "break-word",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: { xs: 2, sm: 3 },
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {song.title}
                </Typography>
                {song.trending && (
                  <Tooltip title="Trending">
                    <TrendingUpIcon
                      sx={{
                        fontSize: isHeaderCollapsed ? "1.5rem" : "2rem",
                        color: "rgb(239, 68, 68)",
                        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))",
                      }}
                    />
                  </Tooltip>
                )}
              </Box>
              
              {/* Action Icons */}
              <Stack direction="row" spacing={1}>
                {song.hasVideo && (
                  <Tooltip title="Watch on YouTube">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(song.videoUrl, "_blank")
                      }}
                      sx={{
                        bgcolor: "rgba(0,0,0,0.6)",
                        backdropFilter: "blur(10px)",
                        color: "white",
                        "&:hover": { bgcolor: "rgba(255,0,0,0.8)" },
                      }}
                    >
                      <YouTubeIcon />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Add to Playlist">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenPlaylistMenu(e)
                    }}
                    sx={{
                      bgcolor: "rgba(0,0,0,0.6)",
                      backdropFilter: "blur(10px)",
                      color: "white",
                      "&:hover": { bgcolor: "rgba(59, 130, 246, 0.8)" },
                    }}
                  >
                    <PlaylistAddIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleFavorite()
                    }}
                    sx={{
                      bgcolor: isFavorite ? "rgba(233, 30, 99, 0.9)" : "rgba(0,0,0,0.6)",
                      backdropFilter: "blur(10px)",
                      color: "white",
                      "&:hover": { bgcolor: "rgba(233, 30, 99, 0.9)" },
                    }}
                  >
                    {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Presentation Mode">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      onPresentationMode()
                    }}
                    sx={{
                      bgcolor: "rgba(0,0,0,0.6)",
                      backdropFilter: "blur(10px)",
                      color: "white",
                      "&:hover": { bgcolor: "rgba(59, 130, 246, 0.8)" },
                    }}
                  >
                    <PresentToAllIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>

            {!isHeaderCollapsed && (
              <>
                {song.titleTransliteration && (
                  <Typography
                    variant="body1"
                    sx={{
                      color: "rgba(255,255,255,0.9)",
                      mb: 1.5,
                      textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                    }}
                  >
                    {song.titleTransliteration}
                  </Typography>
                )}

                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Avatar
                      src={song.artist.photoUrl}
                      alt={song.artist.name}
                      sx={{
                        width: 28,
                        height: 28,
                        border: "2px solid rgba(255,255,255,0.3)",
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        color: "white",
                        fontWeight: 600,
                        textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                      }}
                    >
                      {song.artist.name}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                    •
                  </Typography>
                  <Chip
                    label={`Original: ${song.originalKey}`}
                    size="small"
                    variant="outlined"
                    sx={{
                      bgcolor: "rgba(59, 130, 246, 0.05)",
                      borderColor: "rgb(59, 130, 246)",
                      color: "rgb(59, 130, 246)",
                      fontSize: "0.75rem",
                      height: "24px",
                      fontWeight: 600,
                    }}
                  />
                  <Chip
                    label={song.language}
                    size="small"
                    sx={{
                      bgcolor: "rgba(0,0,0,0.6)",
                      backdropFilter: "blur(10px)",
                      color: "white",
                      fontSize: "0.7rem",
                      height: "22px",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  />
                  {song.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      sx={{
                        bgcolor: "rgba(0,0,0,0.6)",
                        backdropFilter: "blur(10px)",
                        color: "white",
                        fontSize: "0.7rem",
                        height: "22px",
                        border: "1px solid rgba(255,255,255,0.2)",
                      }}
                    />
                  ))}
                </Stack>

                <Box sx={{ mt: 1 }}>
                  <Stack direction="row" spacing={2.5} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <YouTubeIcon sx={{ fontSize: "1.1rem", color: "#FF0000" }} />
                      <Typography
                        variant="caption"
                        sx={{
                          color: "white",
                          fontSize: "0.8rem",
                          fontWeight: 500,
                          textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                        }}
                      >
                        {formatNumber(song.youtubeViews)} views
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <ThumbUpIcon sx={{ fontSize: "1rem", color: "white" }} />
                      <Typography
                        variant="caption"
                        sx={{
                          color: "white",
                          fontSize: "0.8rem",
                          fontWeight: 500,
                          textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                        }}
                      >
                        {formatNumber(song.youtubeLikes)} likes
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <VisibilityIcon sx={{ fontSize: "1rem", color: "white" }} />
                      <Typography
                        variant="caption"
                        sx={{
                          color: "white",
                          fontSize: "0.8rem",
                          fontWeight: 500,
                          textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                        }}
                      >
                        {formatNumber(song.viewCount)} app views
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </>
            )}

            {isHeaderCollapsed && (
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography
                  variant="caption"
                  sx={{
                    color: "rgba(255,255,255,0.8)",
                    textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                  }}
                >
                  {song.artist.name}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                  •
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "rgba(255,255,255,0.8)",
                    textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                  }}
                >
                  {song.language}
                </Typography>
              </Stack>
            )}

            {/* Collapse Toggle - Bottom Right */}
            <Box
              sx={{
                position: "absolute",
                bottom: 0,
                right: 0,
              }}
            >
              <Tooltip title={isHeaderCollapsed ? "Expand Header" : "Collapse Header"}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsHeaderCollapsed(!isHeaderCollapsed)
                  }}
                  sx={{
                    bgcolor: "rgba(0,0,0,0.6)",
                    backdropFilter: "blur(10px)",
                    color: "white",
                    "&:hover": { bgcolor: "rgba(59, 130, 246, 0.8)" },
                  }}
                >
                  {isHeaderCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Controls */}
      <Box sx={{ p: 1.5, borderBottom: "1px solid rgb(38, 38, 38)", bgcolor: "rgb(15, 15, 15)" }}>
        {isMobile ? (
          // Mobile: Show only language tabs and settings button
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            {/* Language Tabs */}
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)", mr: 0.5, fontSize: "0.75rem" }}>
                Language:
              </Typography>
              <ButtonGroup size="small" variant="outlined">
                <Button
                  onClick={() => handleLanguageChange(0)}
                  sx={{
                    bgcolor: lyricsTab === 0 ? "rgba(59, 130, 246, 0.1)" : "transparent",
                    color: lyricsTab === 0 ? "rgb(59, 130, 246)" : "rgb(163, 163, 163)",
                    borderColor: lyricsTab === 0 ? "rgb(59, 130, 246)" : "rgb(38, 38, 38)",
                    "&:hover": {
                      bgcolor: lyricsTab === 0 ? "rgba(59, 130, 246, 0.2)" : "rgb(30, 30, 30)",
                      borderColor: "rgb(59, 130, 246)",
                      color: "rgb(59, 130, 246)",
                    },
                    textTransform: "none",
                    fontSize: "0.75rem",
                    fontWeight: lyricsTab === 0 ? 600 : 400,
                    minWidth: "60px",
                  }}
                >
                  Telugu
                </Button>
                <Button
                  onClick={() => handleLanguageChange(1)}
                  sx={{
                    bgcolor: lyricsTab === 1 ? "rgba(59, 130, 246, 0.1)" : "transparent",
                    color: lyricsTab === 1 ? "rgb(59, 130, 246)" : "rgb(163, 163, 163)",
                    borderColor: lyricsTab === 1 ? "rgb(59, 130, 246)" : "rgb(38, 38, 38)",
                    "&:hover": {
                      bgcolor: lyricsTab === 1 ? "rgba(59, 130, 246, 0.2)" : "rgb(30, 30, 30)",
                      borderColor: "rgb(59, 130, 246)",
                      color: "rgb(59, 130, 246)",
                    },
                    textTransform: "none",
                    fontSize: "0.75rem",
                    fontWeight: lyricsTab === 1 ? 600 : 400,
                    minWidth: "60px",
                  }}
                >
                  English
                </Button>
              </ButtonGroup>
            </Stack>

            {/* Settings Button */}
            <Button
              size="small"
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => setMobileOverlayOpen(true)}
              sx={{
                color: "rgb(163, 163, 163)",
                borderColor: "rgb(38, 38, 38)",
                "&:hover": {
                  borderColor: "rgb(59, 130, 246)",
                  bgcolor: "rgb(30, 30, 30)",
                  color: "rgb(59, 130, 246)",
                },
                textTransform: "none",
                fontSize: "0.75rem",
              }}
            >
              Settings
            </Button>
          </Stack>
        ) : (
          // Desktop: Show all controls
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          {/* Language Tabs - First Position */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)", mr: 0.5, fontSize: "0.75rem" }}>
              Language:
            </Typography>
            <ButtonGroup size="small" variant="outlined">
              <Button
                onClick={() => handleLanguageChange(0)}
                sx={{
                  bgcolor: lyricsTab === 0 ? "rgba(59, 130, 246, 0.1)" : "transparent",
                  color: lyricsTab === 0 ? "rgb(59, 130, 246)" : "rgb(163, 163, 163)",
                  borderColor: lyricsTab === 0 ? "rgb(59, 130, 246)" : "rgb(38, 38, 38)",
                  "&:hover": {
                    bgcolor: lyricsTab === 0 ? "rgba(59, 130, 246, 0.2)" : "rgb(30, 30, 30)",
                    borderColor: "rgb(59, 130, 246)",
                    color: "rgb(59, 130, 246)",
                  },
                  textTransform: "none",
                  fontSize: "0.75rem",
                  fontWeight: lyricsTab === 0 ? 600 : 400,
                  minWidth: "60px",
                }}
              >
                Telugu
              </Button>
              <Button
                onClick={() => handleLanguageChange(1)}
                sx={{
                  bgcolor: lyricsTab === 1 ? "rgba(59, 130, 246, 0.1)" : "transparent",
                  color: lyricsTab === 1 ? "rgb(59, 130, 246)" : "rgb(163, 163, 163)",
                  borderColor: lyricsTab === 1 ? "rgb(59, 130, 246)" : "rgb(38, 38, 38)",
                  "&:hover": {
                    bgcolor: lyricsTab === 1 ? "rgba(59, 130, 246, 0.2)" : "rgb(30, 30, 30)",
                    borderColor: "rgb(59, 130, 246)",
                    color: "rgb(59, 130, 246)",
                  },
                  textTransform: "none",
                  fontSize: "0.75rem",
                  fontWeight: lyricsTab === 1 ? 600 : 400,
                  minWidth: "60px",
                }}
              >
                English
              </Button>
            </ButtonGroup>
          </Stack>


          {/* Bold Toggle */}
          <Divider orientation="vertical" flexItem sx={{ borderColor: "rgb(38, 38, 38)" }} />
          <Button
            size="small"
            variant="outlined"
            startIcon={<FormatBoldIcon />}
            onClick={handleBoldToggle}
            sx={{
              bgcolor: isBold ? "rgba(59, 130, 246, 0.1)" : "transparent",
              color: isBold ? "rgb(59, 130, 246)" : "rgb(163, 163, 163)",
              borderColor: isBold ? "rgb(59, 130, 246)" : "rgb(38, 38, 38)",
              "&:hover": {
                bgcolor: isBold ? "rgba(59, 130, 246, 0.2)" : "rgb(30, 30, 30)",
                borderColor: "rgb(59, 130, 246)",
                color: "rgb(59, 130, 246)",
              },
              textTransform: "none",
              fontSize: "0.75rem",
              fontWeight: isBold ? 600 : 400,
            }}
          >
            Bold
          </Button>

          {/* Font Size */}
          <Divider orientation="vertical" flexItem sx={{ borderColor: "rgb(38, 38, 38)" }} />
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)", mr: 0.5, fontSize: "0.75rem" }}>
              Font:
            </Typography>
            <ButtonGroup size="small" variant="outlined">
              <Button
                onClick={() => handleFontSizeChange(-2)}
                sx={{
                  color: "rgb(163, 163, 163)",
                  borderColor: "rgb(38, 38, 38)",
                  "&:hover": { borderColor: "rgb(59, 130, 246)", bgcolor: "rgb(30, 30, 30)" },
                  minWidth: "32px",
                  px: 1,
                }}
              >
                <RemoveIcon fontSize="small" />
              </Button>
              <Button
                disabled
                sx={{
                  color: "rgb(250, 250, 250)",
                  borderColor: "rgb(38, 38, 38)",
                  minWidth: "48px",
                  px: 1,
                  fontSize: "0.75rem",
                }}
              >
                {fontSize}
              </Button>
              <Button
                onClick={() => handleFontSizeChange(2)}
                sx={{
                  color: "rgb(163, 163, 163)",
                  borderColor: "rgb(38, 38, 38)",
                  "&:hover": { borderColor: "rgb(59, 130, 246)", bgcolor: "rgb(30, 30, 30)" },
                  minWidth: "32px",
                  px: 1,
                }}
              >
                <AddIcon fontSize="small" />
              </Button>
            </ButtonGroup>
          </Stack>

          {/* Text Alignment */}
          <Divider orientation="vertical" flexItem sx={{ borderColor: "rgb(38, 38, 38)" }} />
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)", mr: 0.5, fontSize: "0.75rem" }}>
              Align:
            </Typography>
            <ButtonGroup size="small" variant="outlined">
              <Button
                onClick={() => handleTextAlignChange('left')}
                sx={{
                  bgcolor: textAlign === 'left' ? "rgba(59, 130, 246, 0.1)" : "transparent",
                  color: textAlign === 'left' ? "rgb(59, 130, 246)" : "rgb(163, 163, 163)",
                  borderColor: textAlign === 'left' ? "rgb(59, 130, 246)" : "rgb(38, 38, 38)",
                  "&:hover": {
                    bgcolor: textAlign === 'left' ? "rgba(59, 130, 246, 0.2)" : "rgb(30, 30, 30)",
                    borderColor: "rgb(59, 130, 246)",
                    color: "rgb(59, 130, 246)",
                  },
                  textTransform: "none",
                  fontSize: "0.75rem",
                  fontWeight: textAlign === 'left' ? 600 : 400,
                  minWidth: "40px",
                }}
              >
                <FormatAlignLeftIcon fontSize="small" />
              </Button>
              <Button
                onClick={() => handleTextAlignChange('center')}
                sx={{
                  bgcolor: textAlign === 'center' ? "rgba(59, 130, 246, 0.1)" : "transparent",
                  color: textAlign === 'center' ? "rgb(59, 130, 246)" : "rgb(163, 163, 163)",
                  borderColor: textAlign === 'center' ? "rgb(59, 130, 246)" : "rgb(38, 38, 38)",
                  "&:hover": {
                    bgcolor: textAlign === 'center' ? "rgba(59, 130, 246, 0.2)" : "rgb(30, 30, 30)",
                    borderColor: "rgb(59, 130, 246)",
                    color: "rgb(59, 130, 246)",
                  },
                  textTransform: "none",
                  fontSize: "0.75rem",
                  fontWeight: textAlign === 'center' ? 600 : 400,
                  minWidth: "40px",
                }}
              >
                <FormatAlignCenterIcon fontSize="small" />
              </Button>
              <Button
                onClick={() => handleTextAlignChange('right')}
                sx={{
                  bgcolor: textAlign === 'right' ? "rgba(59, 130, 246, 0.1)" : "transparent",
                  color: textAlign === 'right' ? "rgb(59, 130, 246)" : "rgb(163, 163, 163)",
                  borderColor: textAlign === 'right' ? "rgb(59, 130, 246)" : "rgb(38, 38, 38)",
                  "&:hover": {
                    bgcolor: textAlign === 'right' ? "rgba(59, 130, 246, 0.2)" : "rgb(30, 30, 30)",
                    borderColor: "rgb(59, 130, 246)",
                    color: "rgb(59, 130, 246)",
                  },
                  textTransform: "none",
                  fontSize: "0.75rem",
                  fontWeight: textAlign === 'right' ? 600 : 400,
                  minWidth: "40px",
                }}
              >
                <FormatAlignRightIcon fontSize="small" />
              </Button>
            </ButtonGroup>
          </Stack>

          {/* Transpose */}
          {song.chords && (
            <>
              <Divider orientation="vertical" flexItem sx={{ borderColor: "rgb(38, 38, 38)" }} />
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)", mr: 0.5, fontSize: "0.75rem" }}>
                  Transpose:
                </Typography>
                <ButtonGroup size="small" variant="outlined">
                  <Button
                    onClick={() => handleTranspose(-1)}
                    disabled={transpose <= -6}
                    sx={{
                      color: "rgb(163, 163, 163)",
                      borderColor: "rgb(38, 38, 38)",
                      "&:hover": { borderColor: "rgb(59, 130, 246)", bgcolor: "rgb(30, 30, 30)" },
                      minWidth: "32px",
                      px: 1,
                    }}
                  >
                    <RemoveIcon fontSize="small" />
                  </Button>
                  <Button
                    disabled
                    sx={{
                      color: "rgb(250, 250, 250)",
                      borderColor: "rgb(38, 38, 38)",
                      minWidth: "48px",
                      px: 1,
                      fontSize: "0.75rem",
                    }}
                  >
                    {transpose > 0 ? `+${transpose}` : transpose}
                  </Button>
                  <Button
                    onClick={() => handleTranspose(1)}
                    disabled={transpose >= 6}
                    sx={{
                      color: "rgb(163, 163, 163)",
                      borderColor: "rgb(38, 38, 38)",
                      "&:hover": { borderColor: "rgb(59, 130, 246)", bgcolor: "rgb(30, 30, 30)" },
                      minWidth: "32px",
                      px: 1,
                    }}
                  >
                    <AddIcon fontSize="small" />
                  </Button>
                </ButtonGroup>
              </Stack>

              <Divider orientation="vertical" flexItem sx={{ borderColor: "rgb(38, 38, 38)" }} />
              <Button
                size="small"
                variant="outlined"
                startIcon={<MusicNoteIcon />}
                onClick={() => setShowChords(!showChords)}
                sx={{
                  bgcolor: showChords ? "rgba(59, 130, 246, 0.1)" : "transparent",
                  color: showChords ? "rgb(59, 130, 246)" : "rgb(163, 163, 163)",
                  borderColor: showChords ? "rgb(59, 130, 246)" : "rgb(38, 38, 38)",
                  "&:hover": {
                    bgcolor: showChords ? "rgba(59, 130, 246, 0.2)" : "rgb(30, 30, 30)",
                    borderColor: "rgb(59, 130, 246)",
                    color: "rgb(59, 130, 246)",
                  },
                  textTransform: "none",
                  fontSize: "0.75rem",
                  fontWeight: showChords ? 600 : 400,
                }}
              >
                Chords
              </Button>
            </>
          )}
        </Stack>
        )}
      </Box>

      {/* Mobile Overlay Drawer */}
      <Drawer
        anchor="bottom"
        open={mobileOverlayOpen}
        onClose={() => setMobileOverlayOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: "rgb(15, 15, 15)",
            borderTop: "1px solid rgb(38, 38, 38)",
            borderRadius: "16px 16px 0 0",
            maxHeight: "80vh",
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h6" sx={{ color: "rgb(250, 250, 250)", fontWeight: 600 }}>
              Display Settings
            </Typography>
            <IconButton
              onClick={() => setMobileOverlayOpen(false)}
              sx={{ color: "rgb(163, 163, 163)" }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Telugu Font Selection */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: "rgb(163, 163, 163)", mb: 1, fontSize: "0.875rem" }}>
              Telugu Font
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={teluguFont}
                onChange={(e) => handleTeluguFontChange(e.target.value)}
                sx={{
                  color: "rgb(250, 250, 250)",
                  fontSize: "0.875rem",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgb(38, 38, 38)",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgb(59, 130, 246)",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgb(59, 130, 246)",
                  },
                  "& .MuiSelect-icon": {
                    color: "rgb(163, 163, 163)",
                  },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: "rgb(15, 15, 15)",
                      border: "1px solid rgb(38, 38, 38)",
                      "& .MuiMenuItem-root": {
                        color: "rgb(250, 250, 250)",
                        fontSize: "0.875rem",
                        "&:hover": {
                          bgcolor: "rgb(30, 30, 30)",
                        },
                        "&.Mui-selected": {
                          bgcolor: "rgba(59, 130, 246, 0.1)",
                          color: "rgb(59, 130, 246)",
                        },
                      },
                    },
                  },
                }}
              >
                <MenuItem value="Potta One">Potta One</MenuItem>
                <MenuItem value="Noto Sans">Noto Sans</MenuItem>
                <MenuItem value="Inter">Inter</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Bold Toggle */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: "rgb(163, 163, 163)", mb: 1, fontSize: "0.875rem" }}>
              Text Style
            </Typography>
            <Button
              fullWidth
              size="large"
              variant="outlined"
              startIcon={<FormatBoldIcon />}
              onClick={handleBoldToggle}
              sx={{
                bgcolor: isBold ? "rgba(59, 130, 246, 0.1)" : "transparent",
                color: isBold ? "rgb(59, 130, 246)" : "rgb(163, 163, 163)",
                borderColor: isBold ? "rgb(59, 130, 246)" : "rgb(38, 38, 38)",
                "&:hover": {
                  bgcolor: isBold ? "rgba(59, 130, 246, 0.2)" : "rgb(30, 30, 30)",
                  borderColor: "rgb(59, 130, 246)",
                  color: "rgb(59, 130, 246)",
                },
                textTransform: "none",
                fontSize: "0.875rem",
                fontWeight: isBold ? 600 : 400,
                py: 1.5,
              }}
            >
              Bold Text
            </Button>
          </Box>

          {/* Font Size */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: "rgb(163, 163, 163)", mb: 1, fontSize: "0.875rem" }}>
              Font Size
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                onClick={() => handleFontSizeChange(-2)}
                sx={{
                  color: "rgb(163, 163, 163)",
                  borderColor: "rgb(38, 38, 38)",
                  "&:hover": { borderColor: "rgb(59, 130, 246)", bgcolor: "rgb(30, 30, 30)" },
                  minWidth: "48px",
                  py: 1.5,
                }}
              >
                <RemoveIcon />
              </Button>
              <Box sx={{ 
                flex: 1, 
                textAlign: "center", 
                py: 1.5, 
                bgcolor: "rgb(25, 25, 25)", 
                borderRadius: 1,
                border: "1px solid rgb(38, 38, 38)"
              }}>
                <Typography variant="h6" sx={{ color: "rgb(250, 250, 250)" }}>
                  {fontSize}
                </Typography>
              </Box>
              <Button
                onClick={() => handleFontSizeChange(2)}
                sx={{
                  color: "rgb(163, 163, 163)",
                  borderColor: "rgb(38, 38, 38)",
                  "&:hover": { borderColor: "rgb(59, 130, 246)", bgcolor: "rgb(30, 30, 30)" },
                  minWidth: "48px",
                  py: 1.5,
                }}
              >
                <AddIcon />
              </Button>
            </Stack>
          </Box>

          {/* Text Alignment */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: "rgb(163, 163, 163)", mb: 1, fontSize: "0.875rem" }}>
              Text Alignment
            </Typography>
            <ButtonGroup fullWidth size="large" variant="outlined">
              <Button
                onClick={() => handleTextAlignChange('left')}
                sx={{
                  bgcolor: textAlign === 'left' ? "rgba(59, 130, 246, 0.1)" : "transparent",
                  color: textAlign === 'left' ? "rgb(59, 130, 246)" : "rgb(163, 163, 163)",
                  borderColor: textAlign === 'left' ? "rgb(59, 130, 246)" : "rgb(38, 38, 38)",
                  "&:hover": {
                    bgcolor: textAlign === 'left' ? "rgba(59, 130, 246, 0.2)" : "rgb(30, 30, 30)",
                    borderColor: "rgb(59, 130, 246)",
                    color: "rgb(59, 130, 246)",
                  },
                  textTransform: "none",
                  fontSize: "0.875rem",
                  fontWeight: textAlign === 'left' ? 600 : 400,
                  py: 1.5,
                }}
              >
                <FormatAlignLeftIcon />
              </Button>
              <Button
                onClick={() => handleTextAlignChange('center')}
                sx={{
                  bgcolor: textAlign === 'center' ? "rgba(59, 130, 246, 0.1)" : "transparent",
                  color: textAlign === 'center' ? "rgb(59, 130, 246)" : "rgb(163, 163, 163)",
                  borderColor: textAlign === 'center' ? "rgb(59, 130, 246)" : "rgb(38, 38, 38)",
                  "&:hover": {
                    bgcolor: textAlign === 'center' ? "rgba(59, 130, 246, 0.2)" : "rgb(30, 30, 30)",
                    borderColor: "rgb(59, 130, 246)",
                    color: "rgb(59, 130, 246)",
                  },
                  textTransform: "none",
                  fontSize: "0.875rem",
                  fontWeight: textAlign === 'center' ? 600 : 400,
                  py: 1.5,
                }}
              >
                <FormatAlignCenterIcon />
              </Button>
              <Button
                onClick={() => handleTextAlignChange('right')}
                sx={{
                  bgcolor: textAlign === 'right' ? "rgba(59, 130, 246, 0.1)" : "transparent",
                  color: textAlign === 'right' ? "rgb(59, 130, 246)" : "rgb(163, 163, 163)",
                  borderColor: textAlign === 'right' ? "rgb(59, 130, 246)" : "rgb(38, 38, 38)",
                  "&:hover": {
                    bgcolor: textAlign === 'right' ? "rgba(59, 130, 246, 0.2)" : "rgb(30, 30, 30)",
                    borderColor: "rgb(59, 130, 246)",
                    color: "rgb(59, 130, 246)",
                  },
                  textTransform: "none",
                  fontSize: "0.875rem",
                  fontWeight: textAlign === 'right' ? 600 : 400,
                  py: 1.5,
                }}
              >
                <FormatAlignRightIcon />
              </Button>
            </ButtonGroup>
          </Box>

          {/* Transpose (if chords available) */}
          {song.chords && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ color: "rgb(163, 163, 163)", mb: 1, fontSize: "0.875rem" }}>
                Transpose
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  onClick={() => handleTranspose(-1)}
                  disabled={transpose <= -6}
                  sx={{
                    color: "rgb(163, 163, 163)",
                    borderColor: "rgb(38, 38, 38)",
                    "&:hover": { borderColor: "rgb(59, 130, 246)", bgcolor: "rgb(30, 30, 30)" },
                    minWidth: "48px",
                    py: 1.5,
                  }}
                >
                  <RemoveIcon />
                </Button>
                <Box sx={{ 
                  flex: 1, 
                  textAlign: "center", 
                  py: 1.5, 
                  bgcolor: "rgb(25, 25, 25)", 
                  borderRadius: 1,
                  border: "1px solid rgb(38, 38, 38)"
                }}>
                  <Typography variant="h6" sx={{ color: "rgb(250, 250, 250)" }}>
                    {transpose > 0 ? `+${transpose}` : transpose}
                  </Typography>
                </Box>
                <Button
                  onClick={() => handleTranspose(1)}
                  disabled={transpose >= 6}
                  sx={{
                    color: "rgb(163, 163, 163)",
                    borderColor: "rgb(38, 38, 38)",
                    "&:hover": { borderColor: "rgb(59, 130, 246)", bgcolor: "rgb(30, 30, 30)" },
                    minWidth: "48px",
                    py: 1.5,
                  }}
                >
                  <AddIcon />
                </Button>
              </Stack>
            </Box>
          )}

          {/* Chords Toggle (if chords available) */}
          {song.chords && (
            <Box>
              <Typography variant="subtitle2" sx={{ color: "rgb(163, 163, 163)", mb: 1, fontSize: "0.875rem" }}>
                Display Options
              </Typography>
              <Button
                fullWidth
                size="large"
                variant="outlined"
                startIcon={<MusicNoteIcon />}
                onClick={() => setShowChords(!showChords)}
                sx={{
                  bgcolor: showChords ? "rgba(59, 130, 246, 0.1)" : "transparent",
                  color: showChords ? "rgb(59, 130, 246)" : "rgb(163, 163, 163)",
                  borderColor: showChords ? "rgb(59, 130, 246)" : "rgb(38, 38, 38)",
                  "&:hover": {
                    bgcolor: showChords ? "rgba(59, 130, 246, 0.2)" : "rgb(30, 30, 30)",
                    borderColor: "rgb(59, 130, 246)",
                    color: "rgb(59, 130, 246)",
                  },
                  textTransform: "none",
                  fontSize: "0.875rem",
                  fontWeight: showChords ? 600 : 400,
                  py: 1.5,
                }}
              >
                {showChords ? 'Hide Chords' : 'Show Chords'}
              </Button>
            </Box>
          )}
        </Box>
      </Drawer>

      {/* Lyrics */}
      <Box sx={{ flex: 1, overflow: "auto", p: 3 }}>
        <Stack spacing={3}>
            {currentLyrics.length > 0 ? currentLyrics.map((line, index) => (
              <Box key={index}>
                {showChords && song.chords && currentChords[index] && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: "rgb(59, 130, 246)",
                      fontFamily: "monospace",
                      fontWeight: 600,
                      mb: 0.5,
                      fontSize: `${fontSize - 2}px`,
                      textAlign: textAlign,
                    }}
                  >
                    {currentChords[index]}
                  </Typography>
                )}
                <Typography
                  variant="body1"
                  sx={{
                    color: line ? "rgb(250, 250, 250)" : "transparent",
                    fontSize: `${fontSize}px`,
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap",
                    textAlign: textAlign,
                    fontFamily: getTeluguFontFamily(),
                    fontWeight: lyricsTab === 0 && isBold ? 'bold' : 400,
                  }}
                >
                  {line || "\u00A0"}
                </Typography>
              </Box>
            )) : (
              <Typography
                variant="body1"
                sx={{
                  color: "rgb(163, 163, 163)",
                  fontSize: `${fontSize}px`,
                  lineHeight: 1.8,
                  textAlign: textAlign,
                  py: 4,
                }}
              >
                {lyricsTab === 0 ? "No Telugu lyrics available" : "No English lyrics available"}
              </Typography>
            )}
        </Stack>
      </Box>

      {/* Playlist Menu */}
      <Menu
        anchorEl={playlistMenuAnchor}
        open={Boolean(playlistMenuAnchor)}
        onClose={handleClosePlaylistMenu}
        PaperProps={{
          sx: {
            bgcolor: "rgb(30, 30, 30)",
            color: "rgb(250, 250, 250)",
            minWidth: "200px",
          },
        }}
      >
        {playlists.length === 0 ? (
          <MenuItem disabled>
            <ListItemText primary="No playlists yet" />
          </MenuItem>
        ) : (
          playlists.map((playlist) => (
            <MenuItem key={playlist.id} onClick={() => handleAddToPlaylist(playlist.id)}>
              <ListItemIcon>
                <PlaylistAddIcon sx={{ color: "rgb(163, 163, 163)" }} />
              </ListItemIcon>
              <ListItemText primary={playlist.name} />
            </MenuItem>
          ))
        )}
      </Menu>
    </Box>
  )
}
