"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
} from "@mui/material"
import StarIcon from "@mui/icons-material/Star"
import StarBorderIcon from "@mui/icons-material/StarBorder"
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
  const [isFavorite, setIsFavorite] = useState(false)
  const [fontSize, setFontSize] = useState(16)
  const [transpose, setTranspose] = useState(0)
  const [showChords, setShowChords] = useState(true)
  const [playlistMenuAnchor, setPlaylistMenuAnchor] = useState<null | HTMLElement>(null)
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false)

  useEffect(() => {
    if (user) {
      // Use prop value if available (from authenticated context)
      setIsFavorite(propIsFavorite ?? false)
    } else {
      // Use local storage for anonymous users
      setIsFavorite(storage.isFavorite(song.id))
    }
    setFontSize(storage.getFontSize())
    setTranspose(0)
  }, [song.id, user, propIsFavorite])

  const handleToggleFavorite = () => {
    if (!user) {
      // Redirect to login if not authenticated
      router.push('/login')
      return
    }
    
    if (onFavoritesChange) {
      onFavoritesChange()
    } else {
      // Fallback to local storage
      const newState = storage.toggleFavorite(song.id)
      setIsFavorite(newState)
    }
  }

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(12, Math.min(24, fontSize + delta))
    setFontSize(newSize)
    storage.setFontSize(newSize)
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
          height: isHeaderCollapsed ? "120px" : "240px",
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
                      bgcolor: isFavorite ? "rgba(234, 179, 8, 0.9)" : "rgba(0,0,0,0.6)",
                      backdropFilter: "blur(10px)",
                      color: "white",
                      "&:hover": { bgcolor: "rgba(234, 179, 8, 0.9)" },
                    }}
                  >
                    {isFavorite ? <StarIcon /> : <StarBorderIcon />}
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
                    sx={{
                      bgcolor: "rgba(59, 130, 246, 0.9)",
                      backdropFilter: "blur(10px)",
                      color: "white",
                      fontSize: "0.75rem",
                      height: "24px",
                      fontWeight: 700,
                      border: "1px solid rgba(255,255,255,0.2)",
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
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          {/* Font Size */}
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
                variant={showChords ? "contained" : "outlined"}
                startIcon={<MusicNoteIcon />}
                onClick={() => setShowChords(!showChords)}
                sx={{
                  bgcolor: showChords ? "rgb(59, 130, 246)" : "transparent",
                  color: showChords ? "white" : "rgb(163, 163, 163)",
                  borderColor: "rgb(38, 38, 38)",
                  "&:hover": {
                    bgcolor: showChords ? "rgb(59, 130, 246)" : "rgb(30, 30, 30)",
                    borderColor: "rgb(59, 130, 246)",
                  },
                  textTransform: "none",
                  fontSize: "0.75rem",
                }}
              >
                Chords
              </Button>
            </>
          )}
        </Stack>
      </Box>

      {/* Lyrics */}
      <Box sx={{ flex: 1, overflow: "auto", p: 3 }}>
        <Stack spacing={3}>
          {song.lyrics.map((line, index) => (
            <Box key={index}>
              {showChords && song.chords && transposedChords[index] && (
                <Typography
                  variant="body2"
                  sx={{
                    color: "rgb(59, 130, 246)",
                    fontFamily: "monospace",
                    fontWeight: 600,
                    mb: 0.5,
                    fontSize: `${fontSize - 2}px`,
                  }}
                >
                  {transposedChords[index]}
                </Typography>
              )}
              <Typography
                variant="body1"
                sx={{
                  color: line ? "rgb(250, 250, 250)" : "transparent",
                  fontSize: `${fontSize}px`,
                  lineHeight: 1.8,
                  whiteSpace: "pre-wrap",
                }}
              >
                {line || "\u00A0"}
              </Typography>
            </Box>
          ))}
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
