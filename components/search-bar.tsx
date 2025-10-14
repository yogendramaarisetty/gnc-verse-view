"use client"

import { useState, useEffect, useRef } from "react"
import {
  Box,
  TextField,
  InputAdornment,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Chip,
  CardMedia,
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import HistoryIcon from "@mui/icons-material/History"
import type { Song } from "@/lib/types"
import { storage } from "@/lib/storage"

interface SearchBarProps {
  songs: Song[]
  onSelectSong: (song: Song) => void
}

export function SearchBar({ songs, onSelectSong }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [recentSongs, setRecentSongs] = useState<Song[]>([])
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([])
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load recently viewed songs
    const recentIds = storage.getRecentlyViewed().slice(0, 10)
    const recent = recentIds.map((id) => songs.find((s) => s.id === id)).filter(Boolean) as Song[]
    setRecentSongs(recent)
  }, [songs])

  useEffect(() => {
    // Filter songs based on search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const filtered = songs.filter(
        (song) =>
          song.title.toLowerCase().includes(query) ||
          song.titleTransliteration?.toLowerCase().includes(query) ||
          song.artist.name.toLowerCase().includes(query) ||
          song.language.toLowerCase().includes(query) ||
          song.tags.some((tag) => tag.toLowerCase().includes(query)),
      )
      setFilteredSongs(filtered.slice(0, 10))
    } else {
      setFilteredSongs([])
    }
  }, [searchQuery, songs])

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsFocused(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelectSong = (song: Song) => {
    onSelectSong(song)
    setSearchQuery("")
    setIsFocused(false)
  }

  const showDropdown = isFocused && (searchQuery.trim() ? filteredSongs.length > 0 : recentSongs.length > 0)
  const displaySongs = searchQuery.trim() ? filteredSongs : recentSongs

  return (
    <Box ref={searchRef} sx={{ position: "relative", width: "100%", maxWidth: 600 }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Search songs, artists, or tags..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: "rgb(163, 163, 163)", fontSize: "1.2rem" }} />
            </InputAdornment>
          ),
          sx: {
            bgcolor: "rgb(38, 38, 38)",
            color: "rgb(250, 250, 250)",
            borderRadius: 1,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgb(64, 64, 64)",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgb(82, 82, 82)",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgb(59, 130, 246)",
            },
          },
        }}
        sx={{
          "& .MuiInputBase-input": {
            color: "rgb(250, 250, 250)",
            fontSize: "0.875rem",
            "&::placeholder": {
              color: "rgb(163, 163, 163)",
              opacity: 1,
            },
          },
        }}
      />

      {/* Dropdown with suggestions */}
      {showDropdown && (
        <Paper
          sx={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 1300,
            bgcolor: "rgb(30, 30, 30)",
            border: "1px solid rgb(64, 64, 64)",
            borderRadius: 1,
            maxHeight: 400,
            overflow: "auto",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
          }}
        >
          {!searchQuery.trim() && (
            <Box sx={{ px: 2, py: 1, borderBottom: "1px solid rgb(38, 38, 38)" }}>
              <Typography
                variant="caption"
                sx={{ color: "rgb(163, 163, 163)", display: "flex", alignItems: "center", gap: 0.5 }}
              >
                <HistoryIcon sx={{ fontSize: "0.875rem" }} />
                Recently Viewed
              </Typography>
            </Box>
          )}

          <List dense disablePadding>
            {displaySongs.map((song) => (
              <ListItem key={song.id} disablePadding>
                <ListItemButton
                  onClick={() => handleSelectSong(song)}
                  sx={{
                    py: 1,
                    px: 1.5,
                    display: "flex",
                    gap: 1.5,
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
                      width: 48,
                      height: 48,
                      borderRadius: 1,
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="body2" sx={{ color: "rgb(250, 250, 250)", fontWeight: 500 }}>
                          {song.title}
                        </Typography>
                        <Chip
                          label={song.originalKey}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: "0.65rem",
                            bgcolor: "rgb(59, 130, 246)",
                            color: "white",
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)" }}>
                        {song.artist.name} • {song.language}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  )
}
