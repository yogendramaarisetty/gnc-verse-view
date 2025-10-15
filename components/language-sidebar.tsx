"use client"

import { useState, useEffect } from "react"
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Collapse,
  Typography,
  Badge,
  Divider,
  CardMedia,
} from "@mui/material"
import LanguageIcon from "@mui/icons-material/Language"
import TrendingUpIcon from "@mui/icons-material/TrendingUp"
import StarIcon from "@mui/icons-material/Star"
import HistoryIcon from "@mui/icons-material/History"
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents"
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay"
import ExpandLess from "@mui/icons-material/ExpandLess"
import ExpandMore from "@mui/icons-material/ExpandMore"
import type { Song } from "@/lib/types"
import type { HistorySong } from "@/lib/api/history"
import { storage } from "@/lib/storage"

export type ViewMode =
  | "all"
  | "all-songs"
  | "trending"
  | "favorites"
  | "recent"
  | "all-time-hits"
  | "playlists"

interface LanguageSidebarProps {
  selectedLanguage: string
  onLanguageChange: (language: string) => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  songs: Song[]
  history: HistorySong[]
  favoritesCount: number
  recentCount: number
  playlistsCount: number
  allSongsCount: number
  onSelectSong: (song: Song) => void
  onShowAllSongs: () => void
}

export function LanguageSidebar({
  selectedLanguage,
  onLanguageChange,
  viewMode,
  onViewModeChange,
  songs,
  history,
  favoritesCount,
  recentCount,
  playlistsCount,
  allSongsCount,
  onSelectSong,
  onShowAllSongs,
}: LanguageSidebarProps) {
  const [recentSongs, setRecentSongs] = useState<Song[]>([])

  useEffect(() => {
    if (!songs || songs.length === 0 || !history || history.length === 0) return
    
    // Convert history data to Song objects
    const recentSongsFromHistory = history
      .slice(0, 4) // Get the 4 most recent
      .map(historyItem => {
        // Find the corresponding song in the songs array
        return songs.find(song => song.id === historyItem.id)
      })
      .filter(Boolean) as Song[]
    
    setRecentSongs(recentSongsFromHistory)
  }, [songs, history, recentCount])

  const getSongCountByLanguage = (lang: string) => {
    if (!songs || songs.length === 0) return 0
    return songs.filter((s) => s.language === lang).length
  }

  const trendingCount = songs && songs.length > 0 ? songs.filter((s) => s.trending).length : 0

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "rgb(20, 20, 20)" }}>
      <Box sx={{ p: 2, borderBottom: "1px solid rgb(38, 38, 38)" }}>
        <Typography variant="h6" sx={{ color: "rgb(250, 250, 250)", fontWeight: 600, fontSize: "1.1rem" }}>
          Verse View
        </Typography>
        <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)" }}>
          Christian Songbook
        </Typography>
      </Box>

      <Box sx={{ 
        flex: 1, 
        overflow: "auto",
        "&::-webkit-scrollbar": {
          width: "6px",
        },
        "&::-webkit-scrollbar-track": {
          background: "rgb(38, 38, 38)",
        },
        "&::-webkit-scrollbar-thumb": {
          background: "rgb(64, 64, 64)",
          borderRadius: "3px",
        },
        "&::-webkit-scrollbar-thumb:hover": {
          background: "rgb(82, 82, 82)",
        },
      }}>
        <List dense disablePadding sx={{ pb: 2 }}>
          {/* Quick Access */}
          <ListItem disablePadding>
            <ListItemButton
              selected={viewMode === "trending"}
              onClick={() => onViewModeChange("trending")}
              sx={{
                py: 1,
                "&.Mui-selected": {
                  bgcolor: "rgb(38, 38, 38)",
                  borderLeft: "3px solid rgb(59, 130, 246)",
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <TrendingUpIcon sx={{ fontSize: "1.2rem", color: "rgb(239, 68, 68)" }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Badge badgeContent={trendingCount} color="error" sx={{ "& .MuiBadge-badge": { right: -12 } }}>
                    <Typography variant="body2" sx={{ color: "rgb(250, 250, 250)" }}>
                      Trending Now
                    </Typography>
                  </Badge>
                }
              />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton
              selected={viewMode === "favorites"}
              onClick={() => onViewModeChange("favorites")}
              sx={{
                py: 1,
                "&.Mui-selected": {
                  bgcolor: "rgb(38, 38, 38)",
                  borderLeft: "3px solid rgb(59, 130, 246)",
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <StarIcon sx={{ fontSize: "1.2rem", color: "rgb(234, 179, 8)" }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Badge badgeContent={favoritesCount} color="warning" sx={{ "& .MuiBadge-badge": { right: -12 } }}>
                    <Typography variant="body2" sx={{ color: "rgb(250, 250, 250)" }}>
                      My Favorites
                    </Typography>
                  </Badge>
                }
              />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton
              selected={viewMode === "recent"}
              onClick={() => onViewModeChange("recent")}
              sx={{
                py: 1,
                "&.Mui-selected": {
                  bgcolor: "rgb(38, 38, 38)",
                  borderLeft: "3px solid rgb(59, 130, 246)",
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <HistoryIcon sx={{ fontSize: "1.2rem", color: "rgb(163, 163, 163)" }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Badge badgeContent={recentCount} color="default" sx={{ "& .MuiBadge-badge": { right: -12 } }}>
                    <Typography variant="body2" sx={{ color: "rgb(250, 250, 250)" }}>
                      Recently Viewed
                    </Typography>
                  </Badge>
                }
              />
            </ListItemButton>
          </ListItem>

          {recentSongs.length > 0 && (
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)", mb: 1, display: "block" }}>
                Quick Access
              </Typography>
              <List dense disablePadding>
                {recentSongs.map((song) => (
                  <ListItem key={song.id} disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                      onClick={() => onSelectSong(song)}
                      sx={{
                        py: 0.5,
                        px: 1,
                        borderRadius: 1,
                        display: "flex",
                        gap: 1,
                        "&:hover": {
                          bgcolor: "rgb(38, 38, 38)",
                        },
                      }}
                    >
                      <CardMedia
                        component="img"
                        image={song.thumbnail}
                        alt={song.title}
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 0.5,
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                      />
                      <ListItemText
                        primary={
                          <Typography
                            variant="caption"
                            sx={{
                              color: "rgb(250, 250, 250)",
                              fontSize: "0.75rem",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {song.title}
                          </Typography>
                        }
                        secondary={
                          <Typography
                            variant="caption"
                            sx={{
                              color: "rgb(163, 163, 163)",
                              fontSize: "0.65rem",
                            }}
                          >
                            {song.artist.name}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          <Divider sx={{ my: 1, borderColor: "rgb(38, 38, 38)" }} />



          <ListItem disablePadding>
            <ListItemButton
              selected={viewMode === "all-time-hits"}
              onClick={() => onViewModeChange("all-time-hits")}
              sx={{
                py: 1,
                "&.Mui-selected": {
                  bgcolor: "rgb(38, 38, 38)",
                  borderLeft: "3px solid rgb(59, 130, 246)",
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <EmojiEventsIcon sx={{ fontSize: "1.2rem", color: "rgb(234, 179, 8)" }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2" sx={{ color: "rgb(250, 250, 250)" }}>
                    All Time Hits
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>



          <ListItem disablePadding>
            <ListItemButton
              selected={viewMode === "playlists"}
              onClick={() => onViewModeChange("playlists")}
              sx={{
                py: 1,
                "&.Mui-selected": {
                  bgcolor: "rgb(38, 38, 38)",
                  borderLeft: "3px solid rgb(59, 130, 246)",
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <PlaylistPlayIcon sx={{ fontSize: "1.2rem", color: "rgb(59, 130, 246)" }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Badge badgeContent={playlistsCount} color="primary" sx={{ "& .MuiBadge-badge": { right: -12 } }}>
                    <Typography variant="body2" sx={{ color: "rgb(250, 250, 250)" }}>
                      My Playlists
                    </Typography>
                  </Badge>
                }
              />
            </ListItemButton>
          </ListItem>

          {/* All Songs Menu Item - First */}
          <ListItem disablePadding>
            <ListItemButton
              selected={viewMode === "all-songs"}
              onClick={onShowAllSongs}
              sx={{
                pl: 3,
                py: 1,
                "&.Mui-selected": {
                  bgcolor: "rgb(38, 38, 38)",
                  borderLeft: "3px solid rgb(59, 130, 246)",
                },
              }}
            >
              <ListItemIcon>
                <LanguageIcon sx={{ color: "rgb(163, 163, 163)", fontSize: "1.25rem" }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" sx={{ color: "rgb(250, 250, 250)", fontSize: "0.875rem", fontWeight: 500 }}>
                      All {selectedLanguage} Songs
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)", fontSize: "0.75rem" }}>
                      {allSongsCount}
                    </Typography>
                  </Box>
                }
              />
            </ListItemButton>
          </ListItem>

          <Divider sx={{ my: 1, borderColor: "rgb(38, 38, 38)" }} />
        </List>
      </Box>
    </Box>
  )
}
