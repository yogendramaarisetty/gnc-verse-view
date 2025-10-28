"use client"

import { useState, useEffect, useMemo } from "react"
import { Box, Typography, IconButton, Stack, ToggleButton, ToggleButtonGroup } from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore"
import NavigateNextIcon from "@mui/icons-material/NavigateNext"
import LanguageIcon from "@mui/icons-material/Language"
import TranslateIcon from "@mui/icons-material/Translate"
import type { Song } from "@/lib/types"

interface PresentationModeProps {
  song: Song
  onClose: () => void
}

export function PresentationMode({ song, onClose }: PresentationModeProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [languageMode, setLanguageMode] = useState<'original' | 'english'>('original')

  // Determine which lyrics to use based on language mode
  const currentLyrics = useMemo(() => {
    if (languageMode === 'english' && song.englishLyrics && song.englishLyrics.length > 0) {
      // Clean English lyrics by filtering out headers
      return song.englishLyrics.filter(line => {
        if (!line || line.trim().length === 0) return false
        
        // Filter out common headers that appear in the data
        const headersToFilter = [
          'Telugu Lyrics',
          'English Lyrics', 
          'Audio',
          'Telugu LyricsEnglish LyricsAudio',
          'Telugu LyricsEnglish Lyrics',
          'English LyricsAudio',
          'Download Lyrics as: PPT',
          'Share this:WhatsAppTweet'
        ]
        
        // Only filter out exact matches, not lines that start with these words
        const isExactHeader = headersToFilter.includes(line.trim())
        
        return !isExactHeader
      })
    } else {
      return song.lyrics || []
    }
  }, [languageMode, song.lyrics, song.englishLyrics])

  // Split lyrics into slides (every 4 lines or at empty lines)
  const slides: string[][] = useMemo(() => {
    const slideArray: string[][] = []
    let currentSlideLines: string[] = []

    currentLyrics.forEach((line, index) => {
      if (line === "" || currentSlideLines.length >= 4) {
        if (currentSlideLines.length > 0) {
          slideArray.push([...currentSlideLines])
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
      slideArray.push(currentSlideLines)
    }

    return slideArray
  }, [currentLyrics])

  // Reset to first slide when language mode changes
  useEffect(() => {
    setCurrentSlide(0)
  }, [languageMode])

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
      } else if (e.key === "l" || e.key === "L") {
        // Toggle language if English lyrics are available
        if (song.englishLyrics && song.englishLyrics.length > 0) {
          e.preventDefault()
          setLanguageMode(prev => prev === 'original' ? 'english' : 'original')
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [slides.length, onClose, song.englishLyrics])

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
              Slide {currentSlide + 1} of {slides.length} • {languageMode === 'original' ? song.language : 'English'}
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={2} alignItems="center">
            {/* Language Toggle */}
            {song.englishLyrics && song.englishLyrics.length > 0 && (
              <ToggleButtonGroup
                value={languageMode}
                exclusive
                onChange={(_, newMode) => {
                  if (newMode !== null) {
                    setLanguageMode(newMode)
                  }
                }}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    '&.Mui-selected': {
                      color: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                      },
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  },
                }}
              >
                <ToggleButton value="original">
                  <LanguageIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
                  {song.language}
                </ToggleButton>
                <ToggleButton value="english">
                  <TranslateIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
                  English
                </ToggleButton>
              </ToggleButtonGroup>
            )}
            
            <IconButton onClick={onClose} sx={{ color: "white" }}>
              <CloseIcon />
            </IconButton>
          </Stack>
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
                // Use appropriate font for different languages
                fontFamily: languageMode === 'original' && song.language === 'Telugu' 
                  ? '"Noto Sans Telugu", "Potta One", sans-serif'
                  : languageMode === 'original' && song.language === 'Malayalam'
                  ? '"Noto Sans Malayalam", sans-serif'
                  : languageMode === 'original' && song.language === 'Hindi'
                  ? '"Noto Sans Devanagari", sans-serif'
                  : languageMode === 'original' && song.language === 'Tamil'
                  ? '"Noto Sans Tamil", sans-serif'
                  : languageMode === 'original' && song.language === 'Bengali'
                  ? '"Noto Sans Bengali", sans-serif'
                  : languageMode === 'original' && song.language === 'Kannada'
                  ? '"Noto Sans Kannada", sans-serif'
                  : '"Inter", "Roboto", sans-serif', // Default for English
                fontSize: {
                  xs: '1.5rem',
                  sm: '2rem',
                  md: '2.5rem',
                  lg: '3rem',
                  xl: '3.5rem'
                },
                // Ensure proper text rendering for different scripts
                unicodeBidi: 'bidi-override',
                direction: languageMode === 'original' && ['Arabic', 'Hebrew'].includes(song.language) ? 'rtl' : 'ltr'
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
          {song.englishLyrics && song.englishLyrics.length > 0 && (
            <span> • Press 'L' to switch language</span>
          )}
        </Typography>
      </Box>
    </Box>
  )
}
