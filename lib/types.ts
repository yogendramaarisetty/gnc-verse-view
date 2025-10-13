export interface Artist {
  id: string
  name: string
  photoUrl: string
  totalSongs: number
  totalViews: number
}

export interface Song {
  id: string
  title: string
  titleTransliteration?: string
  artist: Artist
  language: "Malayalam" | "Hindi" | "Tamil" | "Telugu" | "Bengali" | "Kannada" | "English"
  tags: string[]
  lyrics: string[]
  chords?: string[]
  originalKey: string
  thumbnail: string
  hasVideo?: boolean
  videoUrl?: string
  youtubeViews: number
  youtubeLikes: number
  releaseDate: string
  viewCount: number
  trending: boolean
}

export interface Playlist {
  id: string
  name: string
  description: string
  songIds: string[]
  createdAt: string
  shareCode?: string
}

export interface UserSettings {
  fontSize: number
  favorites: string[]
  recentlyViewed: string[]
  playlists: Playlist[]
}
