"use client"

import { useState } from "react"
import { Button, Menu, MenuItem, Avatar, Typography, Divider, ListItemIcon, ListItemText } from "@mui/material"
import { Logout as LogoutIcon, Person as PersonIcon, Settings as SettingsIcon } from "@mui/icons-material"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface UserMenuProps {
  user: {
    id: string
    email: string
    user_metadata?: {
      name?: string
      avatar_url?: string
    }
  }
}

export function UserMenu({ user }: UserMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleSignOut = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast.success("Signed out successfully")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
      handleMenuClose()
    }
  }

  const open = Boolean(anchorEl)
  const displayName = user.user_metadata?.name || user.email.split("@")[0]
  const avatarUrl = user.user_metadata?.avatar_url

  return (
    <>
      <Button
        onClick={handleMenuOpen}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          color: "rgb(250, 250, 250)",
          textTransform: "none",
          "&:hover": { bgcolor: "rgb(38, 38, 38)" },
        }}
      >
        <Avatar
          src={avatarUrl}
          alt={displayName}
          sx={{
            width: 32,
            height: 32,
            bgcolor: "rgb(59, 130, 246)",
            fontSize: "0.875rem",
          }}
        >
          {displayName.charAt(0).toUpperCase()}
        </Avatar>
        <Typography variant="body2" sx={{ color: "rgb(250, 250, 250)" }}>
          {displayName}
        </Typography>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            bgcolor: "rgb(30, 30, 30)",
            color: "rgb(250, 250, 250)",
            minWidth: "200px",
            mt: 1,
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <MenuItem disabled>
          <ListItemText
            primary={
              <Typography variant="body2" sx={{ color: "rgb(163, 163, 163)", fontSize: "0.75rem" }}>
                {user.email}
              </Typography>
            }
          />
        </MenuItem>
        <Divider sx={{ borderColor: "rgb(38, 38, 38)" }} />
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <PersonIcon sx={{ color: "rgb(163, 163, 163)", fontSize: "1.2rem" }} />
          </ListItemIcon>
          <ListItemText primary="Profile" />
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <SettingsIcon sx={{ color: "rgb(163, 163, 163)", fontSize: "1.2rem" }} />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </MenuItem>
        <Divider sx={{ borderColor: "rgb(38, 38, 38)" }} />
        <MenuItem onClick={handleSignOut} disabled={loading}>
          <ListItemIcon>
            <LogoutIcon sx={{ color: "rgb(163, 163, 163)", fontSize: "1.2rem" }} />
          </ListItemIcon>
          <ListItemText primary={loading ? "Signing out..." : "Sign out"} />
        </MenuItem>
      </Menu>
    </>
  )
}
