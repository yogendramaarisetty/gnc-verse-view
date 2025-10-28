import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
// import { Potti_Sreeramulu, Dhurjati, Mandali } from "next/font/google"
import { MuiThemeProvider } from "@/components/mui-theme-provider"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

// const pottiSreeramulu = Potti_Sreeramulu({
//   variable: "--font-potti-sreeramulu",
//   subsets: ["latin"],
//   weight: ["400"],
// })

// const dhurjati = Dhurjati({
//   variable: "--font-dhurjati",
//   subsets: ["latin"],
//   weight: ["400"],
// })

// const mandali = Mandali({
//   variable: "--font-mandali",
//   subsets: ["latin"],
//   weight: ["400"],
// })

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
        <MuiThemeProvider>
          {children}
        </MuiThemeProvider>
      </body>
    </html>
  )
}
