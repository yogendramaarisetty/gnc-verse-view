import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter"
import { ThemeProvider, createTheme } from "@mui/material/styles"
import CssBaseline from "@mui/material/CssBaseline"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

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

export const metadata: Metadata = {
  title: "VerseView Songbook",
  description: "Christian songbook with lyrics, chords, and presentation mode",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
