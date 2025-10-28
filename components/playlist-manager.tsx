"use client"

import { useState, useEffect } from "react"
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Typography,
  Chip,
  Stack,
  Divider,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"
import ShareIcon from "@mui/icons-material/Share"
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay"
import type { Playlist, Song } from "@/lib/types"
import { storage } from "@/lib/storage"
import { useAuth } from "@/lib/hooks/useAuth"
import { useRouter } from "next/navigation"

interface PlaylistManagerProps {
  songs: Song[]
  onSelectPlaylist: (playlist: Playlist) => void
  onCreatePlaylist?: (name: string, description: string) => void
  playlists?: Playlist[]
}

export function PlaylistManager({ 
  songs, 
  onSelectPlaylist, 
  onCreatePlaylist: propOnCreatePlaylist,
  playlists: propPlaylists 
}: PlaylistManagerProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("")
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null)

  useEffect(() => {
    if (propPlaylists) {
      setPlaylists(propPlaylists)
    } else {
      setPlaylists(storage.getPlaylists())
    }
  }, [propPlaylists])

  const handleCreatePlaylist = () => {
    if (!user) {
      // Redirect to login if not authenticated
      router.push('/login')
      return
    }

    if (newPlaylistName.trim()) {
      if (propOnCreatePlaylist) {
        propOnCreatePlaylist(newPlaylistName, newPlaylistDescription)
      } else {
        // Fallback to local storage
        const playlist = storage.createPlaylist(newPlaylistName, newPlaylistDescription)
        setPlaylists(storage.getPlaylists())
      }
      setNewPlaylistName("")
      setNewPlaylistDescription("")
      setCreateDialogOpen(false)
    }
  }

  const handleDeletePlaylist = (playlistId: string) => {
    storage.deletePlaylist(playlistId)
    setPlaylists(storage.getPlaylists())
  }

  const handleSharePlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist)
    setShareDialogOpen(true)
  }

  const copyShareCode = () => {
    if (selectedPlaylist?.shareCode) {
      navigator.clipboard.writeText(selectedPlaylist.shareCode)
    }
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "rgb(20, 20, 20)" }}>
      <Box
        sx={{
          p: 2,
          borderBottom: "1px solid rgb(38, 38, 38)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" sx={{ color: "rgb(250, 250, 250)", fontSize: "1rem", fontWeight: 600 }}>
          My Playlists
        </Typography>
        <Button
          startIcon={<AddIcon />}
          size="small"
          onClick={() => setCreateDialogOpen(true)}
          sx={{
            bgcolor: "rgb(59, 130, 246)",
            color: "white",
            textTransform: "none",
            fontSize: "0.875rem",
            "&:hover": { bgcolor: "rgb(37, 99, 235)" },
          }}
        >
          Create
        </Button>
      </Box>

      <Box sx={{ flex: 1, overflow: "auto" }}>
        {playlists.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <PlaylistPlayIcon sx={{ fontSize: "3rem", color: "rgb(163, 163, 163)", mb: 1 }} />
            <Typography variant="body2" sx={{ color: "rgb(163, 163, 163)", mb: 2 }}>
              No playlists yet
            </Typography>
            <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)" }}>
              Create playlists for Sunday worship, meetings, or special occasions
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {playlists.map((playlist, index) => (
              <Box key={playlist.id}>
                <ListItem
                  disablePadding
                  secondaryAction={
                    <Box>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleSharePlaylist(playlist)}
                        sx={{ color: "rgb(163, 163, 163)", mr: 0.5 }}
                      >
                        <ShareIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleDeletePlaylist(playlist.id)}
                        sx={{ color: "rgb(239, 68, 68)" }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemButton
                    onClick={() => onSelectPlaylist(playlist)}
                    sx={{
                      py: 0.75,
                      px: 1.5,
                      minHeight: 48,
                      "&:hover": { bgcolor: "rgb(30, 30, 30)" },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ color: "rgb(250, 250, 250)", fontWeight: 500 }}>
                          {playlist.name}
                        </Typography>
                      }
                      secondary={
                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                          {playlist.description && (
                            <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)", fontSize: "0.75rem" }}>
                              {playlist.description}
                            </Typography>
                          )}
                          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                            <Chip
                              label={`${playlist.songIds.length} songs`}
                              size="small"
                              sx={{
                                height: "18px",
                                fontSize: "0.7rem",
                                bgcolor: "rgb(38, 38, 38)",
                                color: "rgb(163, 163, 163)",
                              }}
                            />
                            <Typography variant="caption" sx={{ color: "rgb(163, 163, 163)", fontSize: "0.7rem" }}>
                              {new Date(playlist.createdAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Stack>
                      }
                    />
                  </ListItemButton>
                </ListItem>
                {index < playlists.length - 1 && <Divider sx={{ borderColor: "rgb(38, 38, 38)" }} />}
              </Box>
            ))}
          </List>
        )}
      </Box>

      {/* Create Playlist Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: "rgb(30, 30, 30)",
            color: "rgb(250, 250, 250)",
            minWidth: "400px",
          },
        }}
      >
        <DialogTitle>Create New Playlist</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Playlist Name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="e.g., Sunday Worship, Christmas Service"
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: "rgb(38, 38, 38)",
                  color: "rgb(250, 250, 250)",
                  "& fieldset": { borderColor: "rgb(59, 59, 59)" },
                  "&:hover fieldset": { borderColor: "rgb(59, 130, 246)" },
                  "&.Mui-focused fieldset": { borderColor: "rgb(59, 130, 246)" },
                },
                "& .MuiInputLabel-root": { color: "rgb(163, 163, 163)" },
              }}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description (Optional)"
              value={newPlaylistDescription}
              onChange={(e) => setNewPlaylistDescription(e.target.value)}
              placeholder="Add a description for this playlist"
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: "rgb(38, 38, 38)",
                  color: "rgb(250, 250, 250)",
                  "& fieldset": { borderColor: "rgb(59, 59, 59)" },
                  "&:hover fieldset": { borderColor: "rgb(59, 130, 246)" },
                  "&.Mui-focused fieldset": { borderColor: "rgb(59, 130, 246)" },
                },
                "& .MuiInputLabel-root": { color: "rgb(163, 163, 163)" },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} sx={{ color: "rgb(163, 163, 163)" }}>
            Cancel
          </Button>
          <Button
            onClick={handleCreatePlaylist}
            disabled={!newPlaylistName.trim()}
            sx={{
              bgcolor: "rgb(59, 130, 246)",
              color: "white",
              "&:hover": { bgcolor: "rgb(37, 99, 235)" },
              "&:disabled": { bgcolor: "rgb(38, 38, 38)", color: "rgb(163, 163, 163)" },
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Playlist Dialog */}
      <Dialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: "rgb(30, 30, 30)",
            color: "rgb(250, 250, 250)",
            minWidth: "400px",
          },
        }}
      >
        <DialogTitle>Share Playlist</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: "rgb(163, 163, 163)" }}>
              Share this code with others to let them access your playlist:
            </Typography>
            <Box
              sx={{
                bgcolor: "rgb(38, 38, 38)",
                p: 2,
                borderRadius: 1,
                textAlign: "center",
                border: "1px solid rgb(59, 59, 59)",
              }}
            >
              <Typography variant="h5" sx={{ color: "rgb(59, 130, 246)", fontWeight: 600, letterSpacing: 2 }}>
                {selectedPlaylist?.shareCode}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)} sx={{ color: "rgb(163, 163, 163)" }}>
            Close
          </Button>
          <Button
            onClick={copyShareCode}
            sx={{
              bgcolor: "rgb(59, 130, 246)",
              color: "white",
              "&:hover": { bgcolor: "rgb(37, 99, 235)" },
            }}
          >
            Copy Code
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
