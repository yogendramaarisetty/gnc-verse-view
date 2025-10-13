"use client"

import type React from "react"

import { useState, useMemo } from "react"
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Box,
  Chip,
  Stack,
  Typography,
  InputAdornment,
  IconButton,
  Divider,
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import BookmarkIcon from "@mui/icons-material/Bookmark"
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder"
import MusicNoteIcon from "@mui/icons-material/MusicNote"
import type { Song } from "@/lib/types"
import { LANGUAGES, TAGS } from "@/lib/song-data"
import { storage } from "@/lib/storage"

interface SongListProps {
  songs: Song[]
  onSelectSong: (song: Song) => void
  selectedSongId?: string
}

export function SongList({ songs, onSelectSong, selectedSongId }: SongListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState("All")
  const [selectedTag, setSelectedTag] = useState("All")
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false)
  const [bookmarks, setBookmarks] = useState<string[]>([])

  // Load bookmarks on mount
  useState(() => {
    setBookmarks(storage.getBookmarks())
  })

  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        song.title.toLowerCase().includes(searchLower) ||
        song.titleTransliteration?.toLowerCase().includes(searchLower) ||
        song.author.toLowerCase().includes(searchLower) ||
        song.lyrics.some((line) => line.toLowerCase().includes(searchLower))

      // Language filter
      const matchesLanguage = selectedLanguage === "All" || song.language === selectedLanguage

      // Tag filter
      const matchesTag = selectedTag === "All" || song.tags.includes(selectedTag)

      // Bookmark filter
      const matchesBookmark = !showBookmarksOnly || bookmarks.includes(song.id)

      return matchesSearch && matchesLanguage && matchesTag && matchesBookmark
    })
  }, [songs, searchQuery, selectedLanguage, selectedTag, showBookmarksOnly, bookmarks])

  const handleToggleBookmark = (songId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    storage.toggleBookmark(songId)
    setBookmarks(storage.getBookmarks())
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "rgb(20, 20, 20)" }}>
      {/* Search */}
      <Box sx={{ p: 1.5, borderBottom: "1px solid rgb(38, 38, 38)" }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search songs, lyrics, author..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "rgb(163, 163, 163)" }} />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              bgcolor: "rgb(38, 38, 38)",
              color: "rgb(250, 250, 250)",
              "& fieldset": { borderColor: "rgb(38, 38, 38)" },
              "&:hover fieldset": { borderColor: "rgb(59, 130, 246)" },
              "&.Mui-focused fieldset": { borderColor: "rgb(59, 130, 246)" },
            },
          }}
        />
      </Box>

      {/* Filters */}
      <Box sx={{ p: 1.5, borderBottom: "1px solid rgb(38, 38, 38)" }}>
        <Stack spacing={1}>
          {/* Language Filter */}
          <Box>
            <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)", mb: 0.5, display: "block" }}>
              Language
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {LANGUAGES.map((lang) => (
                <Chip
                  key={lang}
                  label={lang}
                  size="small"
                  onClick={() => setSelectedLanguage(lang)}
                  sx={{
                    bgcolor: selectedLanguage === lang ? "rgb(59, 130, 246)" : "rgb(38, 38, 38)",
                    color: selectedLanguage === lang ? "white" : "rgb(163, 163, 163)",
                    "&:hover": {
                      bgcolor: selectedLanguage === lang ? "rgb(59, 130, 246)" : "rgb(50, 50, 50)",
                    },
                    fontSize: "0.75rem",
                    height: "24px",
                  }}
                />
              ))}
            </Stack>
          </Box>

          {/* Tag Filter */}
          <Box>
            <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)", mb: 0.5, display: "block" }}>
              Tags
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {TAGS.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  onClick={() => setSelectedTag(tag)}
                  sx={{
                    bgcolor: selectedTag === tag ? "rgb(59, 130, 246)" : "rgb(38, 38, 38)",
                    color: selectedTag === tag ? "white" : "rgb(163, 163, 163)",
                    "&:hover": {
                      bgcolor: selectedTag === tag ? "rgb(59, 130, 246)" : "rgb(50, 50, 50)",
                    },
                    fontSize: "0.75rem",
                    height: "24px",
                  }}
                />
              ))}
            </Stack>
          </Box>

          {/* Bookmarks Toggle */}
          <Box>
            <Chip
              icon={showBookmarksOnly ? <BookmarkIcon /> : <BookmarkBorderIcon />}
              label={`Bookmarks (${bookmarks.length})`}
              size="small"
              onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
              sx={{
                bgcolor: showBookmarksOnly ? "rgb(59, 130, 246)" : "rgb(38, 38, 38)",
                color: showBookmarksOnly ? "white" : "rgb(163, 163, 163)",
                "&:hover": {
                  bgcolor: showBookmarksOnly ? "rgb(59, 130, 246)" : "rgb(50, 50, 50)",
                },
                fontSize: "0.75rem",
                height: "24px",
              }}
            />
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
                    onClick={(e) => handleToggleBookmark(song.id, e)}
                    sx={{ color: bookmarks.includes(song.id) ? "rgb(59, 130, 246)" : "rgb(163, 163, 163)" }}
                  >
                    {bookmarks.includes(song.id) ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                  </IconButton>
                }
              >
                <ListItemButton
                  selected={selectedSongId === song.id}
                  onClick={() => onSelectSong(song)}
                  sx={{
                    py: 1,
                    px: 1.5,
                    "&.Mui-selected": {
                      bgcolor: "rgb(38, 38, 38)",
                      borderLeft: "3px solid rgb(59, 130, 246)",
                    },
                    "&:hover": {
                      bgcolor: "rgb(30, 30, 30)",
                    },
                  }}
                >
                  <MusicNoteIcon sx={{ mr: 1.5, fontSize: "1.2rem", color: "rgb(163, 163, 163)" }} />
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ color: "rgb(250, 250, 250)", fontWeight: 500 }}>
                        {song.title}
                      </Typography>
                    }
                    secondary={
                      <Stack spacing={0.25}>
                        {song.titleTransliteration && (
                          <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)" }}>
                            {song.titleTransliteration}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)" }}>
                          {song.author} • {song.language}
                        </Typography>
                      </Stack>
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
