"use client"

import { useState, useEffect } from "react"
import { Box, Typography, IconButton, Stack } from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore"
import NavigateNextIcon from "@mui/icons-material/NavigateNext"
import type { Song } from "@/lib/types"

interface PresentationModeProps {
  song: Song
  onClose: () => void
}

export function PresentationMode({ song, onClose }: PresentationModeProps) {
  const [currentSlide, setCurrentSlide] = useState(0)

  // Split lyrics into slides (every 4 lines or at empty lines)
  const slides: string[][] = []
  let currentSlideLines: string[] = []

  song.lyrics.forEach((line, index) => {
    if (line === "" || currentSlideLines.length >= 4) {
      if (currentSlideLines.length > 0) {
        slides.push([...currentSlideLines])
        currentSlideLines = []
      }
      if (line !== "") {
        currentSlideLines.push(line)
      }
    } else {
      currentSlideLines.push(line)
    }
  })

  if (currentSlideLines.length > 0) {
    slides.push(currentSlideLines)
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault()
        setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1))
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        setCurrentSlide((prev) => Math.max(prev - 1, 0))
      } else if (e.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [slides.length, onClose])

  const handleNext = () => {
    setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1))
  }

  const handlePrevious = () => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0))
  }

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: "black",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: "rgba(0, 0, 0, 0.8)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" sx={{ color: "white", fontWeight: 600 }}>
              {song.title}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.6)" }}>
              Slide {currentSlide + 1} of {slides.length}
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Slide Content */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 4,
        }}
      >
        <Stack spacing={3} sx={{ textAlign: "center", maxWidth: "1200px", width: "100%" }}>
          {slides[currentSlide]?.map((line, index) => (
            <Typography
              key={index}
              variant="h3"
              sx={{
                color: "white",
                fontWeight: 500,
                lineHeight: 1.6,
                textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)",
              }}
            >
              {line}
            </Typography>
          ))}
        </Stack>
      </Box>

      {/* Navigation */}
      <Box
        sx={{
          p: 2,
          bgcolor: "rgba(0, 0, 0, 0.8)",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <Stack direction="row" justifyContent="center" spacing={2}>
          <IconButton
            onClick={handlePrevious}
            disabled={currentSlide === 0}
            sx={{
              color: "white",
              "&:disabled": { color: "rgba(255, 255, 255, 0.3)" },
            }}
          >
            <NavigateBeforeIcon fontSize="large" />
          </IconButton>
          <IconButton
            onClick={handleNext}
            disabled={currentSlide === slides.length - 1}
            sx={{
              color: "white",
              "&:disabled": { color: "rgba(255, 255, 255, 0.3)" },
            }}
          >
            <NavigateNextIcon fontSize="large" />
          </IconButton>
        </Stack>
        <Typography
          variant="caption"
          sx={{ color: "rgba(255, 255, 255, 0.6)", textAlign: "center", display: "block", mt: 1 }}
        >
          Use arrow keys or space to navigate • ESC to exit
        </Typography>
      </Box>
    </Box>
  )
}
