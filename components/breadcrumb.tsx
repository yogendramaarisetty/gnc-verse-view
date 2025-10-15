"use client"

import { Box, Typography, IconButton, Breadcrumbs, Link } from "@mui/material"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import HomeIcon from "@mui/icons-material/Home"
import type { ViewMode } from "@/components/language-sidebar"

interface BreadcrumbProps {
  viewMode: ViewMode
  selectedLanguage: string
  selectedPlaylist?: string | null
  onBack: () => void
  onHome: () => void
}

export function Breadcrumb({ 
  viewMode, 
  selectedLanguage, 
  selectedPlaylist, 
  onBack, 
  onHome 
}: BreadcrumbProps) {
  const getBreadcrumbItems = () => {
    const items = [
      <Link
        key="home"
        component="button"
        onClick={onHome}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          color: "rgb(163, 163, 163)",
          textDecoration: "none",
          "&:hover": {
            color: "rgb(250, 250, 250)",
          },
        }}
      >
        <HomeIcon sx={{ fontSize: "1rem" }} />
        Home
      </Link>
    ]

    if (viewMode === "playlists" && selectedPlaylist) {
      items.push(
        <Typography key="playlist" sx={{ color: "rgb(250, 250, 250)" }}>
          {selectedPlaylist}
        </Typography>
      )
    } else if (viewMode === "language" && selectedLanguage) {
      items.push(
        <Typography key="language" sx={{ color: "rgb(250, 250, 250)" }}>
          {selectedLanguage}
        </Typography>
      )
    } else if (viewMode === "trending") {
      items.push(
        <Typography key="trending" sx={{ color: "rgb(250, 250, 250)" }}>
          Trending
        </Typography>
      )
    } else if (viewMode === "favorites") {
      items.push(
        <Typography key="favorites" sx={{ color: "rgb(250, 250, 250)" }}>
          Favorites
        </Typography>
      )
    } else if (viewMode === "recent") {
      items.push(
        <Typography key="recent" sx={{ color: "rgb(250, 250, 250)" }}>
          Recent
        </Typography>
      )
    }

    return items
  }

  return (
    <Box sx={{ 
      display: "flex", 
      alignItems: "center", 
      gap: 1, 
      p: 2, 
      borderBottom: "1px solid rgb(38, 38, 38)",
      bgcolor: "rgb(20, 20, 20)"
    }}>
      <IconButton
        onClick={onBack}
        sx={{ 
          color: "rgb(250, 250, 250)",
          p: 0.5
        }}
      >
        <ArrowBackIcon />
      </IconButton>
      <Breadcrumbs
        separator="›"
        sx={{
          "& .MuiBreadcrumbs-separator": {
            color: "rgb(100, 100, 100)",
          },
        }}
      >
        {getBreadcrumbItems()}
      </Breadcrumbs>
    </Box>
  )
}


