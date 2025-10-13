'use client'

import React from 'react'
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter"
import { ThemeProvider, createTheme } from "@mui/material/styles"
import CssBaseline from "@mui/material/CssBaseline"

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "rgb(59, 130, 246)",
    },
    background: {
      default: "rgb(10, 10, 10)",
      paper: "rgb(20, 20, 20)",
    },
    text: {
      primary: "rgb(250, 250, 250)",
      secondary: "rgb(163, 163, 163)",
    },
  },
  typography: {
    fontFamily: "var(--font-geist-sans)",
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: "thin",
          scrollbarColor: "rgb(38, 38, 38) rgb(20, 20, 20)",
          "&::-webkit-scrollbar": {
            width: "8px",
            height: "8px",
          },
          "&::-webkit-scrollbar-track": {
            background: "rgb(20, 20, 20)",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "rgb(38, 38, 38)",
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background: "rgb(50, 50, 50)",
          },
        },
      },
    },
  },
})

interface MuiThemeProviderProps {
  children: React.ReactNode
}

export function MuiThemeProvider({ children }: MuiThemeProviderProps) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  )
}
