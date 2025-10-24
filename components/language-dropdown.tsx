"use client"

import { useState } from "react"
import {
  FormControl,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  SelectChangeEvent,
  IconButton,
  useMediaQuery,
  useTheme,
  Slide,
  Tooltip,
} from "@mui/material"
import { Language } from "@mui/icons-material"

interface LanguageDropdownProps {
  selectedLanguage: string
  onLanguageChange: (language: string) => void
  languages: { code: string; name: string; count: number }[]
}

export function LanguageDropdown({ 
  selectedLanguage, 
  onLanguageChange, 
  languages 
}: LanguageDropdownProps) {
  const [open, setOpen] = useState(false)
  const [isMobileDropdownExpanded, setIsMobileDropdownExpanded] = useState(false)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const handleChange = (event: SelectChangeEvent<string>) => {
    onLanguageChange(event.target.value)
    if (isMobile) {
      setIsMobileDropdownExpanded(false)
    }
  }

  const handleMobileDropdownClick = () => {
    if (isMobile) {
      setIsMobileDropdownExpanded(true)
      setOpen(true)
    }
  }

  const handleMobileDropdownClose = () => {
    if (isMobile) {
      setIsMobileDropdownExpanded(false)
      setOpen(false)
    }
  }

  const selectedLanguageData = languages.find(lang => lang.code === selectedLanguage)

  return (
    <Box sx={{ minWidth: { xs: 120, sm: 200 } }}>
      {isMobile ? (
        // Mobile: Icon-only interface with expandable dropdown
        <>
          {!isMobileDropdownExpanded ? (
            // Mobile: Show only language icon
            <Tooltip title={`${selectedLanguageData?.name || "Language"} (${selectedLanguageData?.count || 0})`}>
              <IconButton
                onClick={handleMobileDropdownClick}
                sx={{
                  color: "rgb(250, 250, 250)",
                  p: 1,
                  "&:hover": {
                    bgcolor: "rgb(38, 38, 38)",
                  },
                }}
              >
                <Language />
              </IconButton>
            </Tooltip>
          ) : (
            // Mobile: Expanded language dropdown
            <Slide direction="left" in={isMobileDropdownExpanded} mountOnEnter unmountOnExit>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <FormControl fullWidth size="small">
                  <Select
                    value={selectedLanguage}
                    onChange={handleChange}
                    displayEmpty
                    open={open}
                    onOpen={() => setOpen(true)}
                    onClose={() => setOpen(false)}
                    autoFocus
                    sx={{
                      color: "rgb(250, 250, 250)",
                      fontSize: '0.8rem',
                      height: 40,
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgb(64, 64, 64)",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgb(82, 82, 82)",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgb(59, 130, 246)",
                      },
                      "& .MuiSelect-select": {
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      },
                    }}
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Language sx={{ fontSize: "0.9rem", color: "rgb(163, 163, 163)" }} />
                        <Typography variant="body2" sx={{ color: "rgb(250, 250, 250)", fontSize: '0.8rem' }}>
                          {selectedLanguageData?.name || "Select Language"}
                        </Typography>
                        {selectedLanguageData && (
                          <Chip
                            label={selectedLanguageData.count}
                            size="small"
                            variant="outlined"
                            sx={{
                              height: 16,
                              fontSize: "0.6rem",
                              bgcolor: "rgba(59, 130, 246, 0.05)",
                              borderColor: "rgb(59, 130, 246)",
                              color: "rgb(59, 130, 246)",
                              fontWeight: 600,
                            }}
                          />
                        )}
                      </Box>
                    )}
                  >
                    {languages.map((language) => (
                      <MenuItem 
                        key={language.code} 
                        value={language.code}
                        sx={{
                          color: "rgb(250, 250, 250)",
                          "&:hover": {
                            bgcolor: "rgb(30, 30, 30)",
                          },
                          "&.Mui-selected": {
                            bgcolor: "rgba(59, 130, 246, 0.1)",
                            "&:hover": {
                              bgcolor: "rgba(59, 130, 246, 0.2)",
                            },
                          },
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Language sx={{ fontSize: "0.9rem", color: "rgb(163, 163, 163)" }} />
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                              {language.name}
                            </Typography>
                          </Box>
                          <Chip
                            label={language.count}
                            size="small"
                            variant="outlined"
                            sx={{
                              height: 16,
                              fontSize: "0.6rem",
                              bgcolor: "rgba(59, 130, 246, 0.05)",
                              borderColor: "rgb(59, 130, 246)",
                              color: "rgb(59, 130, 246)",
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <IconButton
                  onClick={handleMobileDropdownClose}
                  sx={{
                    color: "rgb(250, 250, 250)",
                    p: 1,
                    "&:hover": {
                      bgcolor: "rgb(38, 38, 38)",
                    },
                  }}
                >
                  <Language />
                </IconButton>
              </Box>
            </Slide>
          )}
        </>
      ) : (
        // Desktop: Full language dropdown
        <FormControl fullWidth size="small">
          <Select
            value={selectedLanguage}
            onChange={handleChange}
            displayEmpty
            open={open}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            sx={{
              color: "rgb(250, 250, 250)",
              fontSize: '0.9rem',
              height: 44,
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgb(64, 64, 64)",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgb(82, 82, 82)",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgb(59, 130, 246)",
              },
              "& .MuiSelect-select": {
                display: "flex",
                alignItems: "center",
                gap: 1,
              },
            }}
            renderValue={(selected) => (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Language sx={{ fontSize: "1rem", color: "rgb(163, 163, 163)" }} />
                <Typography variant="body2" sx={{ color: "rgb(250, 250, 250)" }}>
                  {selectedLanguageData?.name || "Select Language"}
                </Typography>
                {selectedLanguageData && (
                  <Chip
                    label={selectedLanguageData.count}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 18,
                      fontSize: "0.65rem",
                      bgcolor: "rgba(59, 130, 246, 0.05)",
                      borderColor: "rgb(59, 130, 246)",
                      color: "rgb(59, 130, 246)",
                      fontWeight: 600,
                    }}
                  />
                )}
              </Box>
            )}
          >
            {languages.map((language) => (
              <MenuItem 
                key={language.code} 
                value={language.code}
                sx={{
                  color: "rgb(250, 250, 250)",
                  "&:hover": {
                    bgcolor: "rgb(30, 30, 30)",
                  },
                  "&.Mui-selected": {
                    bgcolor: "rgba(59, 130, 246, 0.1)",
                    "&:hover": {
                      bgcolor: "rgba(59, 130, 246, 0.2)",
                    },
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Language sx={{ fontSize: "1rem", color: "rgb(163, 163, 163)" }} />
                    <Typography variant="body2">
                      {language.name}
                    </Typography>
                  </Box>
                  <Chip
                    label={language.count}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 18,
                      fontSize: "0.65rem",
                      bgcolor: "rgba(59, 130, 246, 0.05)",
                      borderColor: "rgb(59, 130, 246)",
                      color: "rgb(59, 130, 246)",
                      fontWeight: 600,
                    }}
                  />
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </Box>
  )
}
