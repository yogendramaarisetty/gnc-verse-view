# GNC Verse View - AI Agent Prompt

## Project Overview

**GNC Verse View** is a comprehensive Christian songbook application built with Next.js 15, React 18, TypeScript, and Supabase. It provides a modern, responsive interface for worship leaders, musicians, and congregations to access Christian songs with lyrics, chords, and presentation capabilities.

## Core Features

### 🎵 **Song Management**
- **Multi-language Support**: Malayalam, Hindi, Tamil, Telugu, Bengali, Kannada, English
- **Rich Song Data**: Lyrics, chords, original key, transliterations
- **Artist Information**: Photos, total songs, view counts
- **Media Integration**: YouTube videos, thumbnails, view counts
- **Search & Filter**: Advanced search with language filtering
- **Trending Songs**: Popular songs based on view counts

### 👤 **User Authentication & Personalization**
- **Supabase Auth**: Email/password and Google OAuth
- **User Profiles**: Customizable user settings
- **Favorites System**: Save and manage favorite songs
- **View History**: Track recently viewed songs
- **Personal Playlists**: Create, manage, and share playlists

### 🎤 **Presentation Features**
- **Presentation Mode**: Full-screen display for worship services
- **Chord Transposition**: Real-time chord key changes
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark Theme**: Professional worship environment

### 📱 **User Interface**
- **Material-UI Components**: Modern, accessible design
- **Responsive Layout**: Mobile-first design with drawer navigation
- **Language Sidebar**: Easy navigation between languages
- **Song List Panel**: Organized song browsing
- **Main Viewer**: Full-featured song display

## Technical Architecture

### **Frontend Stack**
- **Framework**: Next.js 15 with App Router
- **UI Library**: Material-UI (MUI) v5
- **Styling**: Emotion CSS-in-JS
- **State Management**: React Hooks (useState, useEffect, custom hooks)
- **TypeScript**: Full type safety

### **Backend & Database**
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase subscriptions
- **Storage**: Supabase Storage for thumbnails
- **API**: Next.js API routes with Supabase client

### **Key Components**

#### **Core Pages**
- `app/page.tsx` - Main application interface
- `app/login/page.tsx` - Authentication page
- `app/layout.tsx` - Root layout with theme provider

#### **UI Components**
- `components/song-viewer.tsx` - Main song display with chords/lyrics
- `components/enhanced-song-list.tsx` - Advanced song listing
- `components/presentation-mode.tsx` - Full-screen presentation
- `components/playlist-manager.tsx` - Playlist management
- `components/search-bar.tsx` - Global search functionality
- `components/language-sidebar.tsx` - Language navigation

#### **Authentication Components**
- `components/auth/login-button.tsx` - Login/logout functionality
- `components/auth/user-menu.tsx` - User profile menu

#### **Data Management**
- `lib/hooks/useAuth.ts` - Authentication state management
- `lib/hooks/useSongs.ts` - Song data fetching
- `lib/hooks/useFavorites.ts` - Favorites management
- `lib/hooks/usePlaylists.ts` - Playlist operations
- `lib/hooks/useHistory.ts` - View history tracking

#### **API Layer**
- `lib/api/songs.ts` - Song CRUD operations
- `lib/api/favorites.ts` - Favorites management
- `lib/api/playlists.ts` - Playlist operations
- `lib/api/history.ts` - History tracking

### **Database Schema**

#### **Core Tables**
- `artists` - Artist information and metadata
- `songs` - Song data with lyrics, chords, metadata
- `playlists` - User-created playlists
- `playlist_songs` - Playlist-song relationships
- `user_favorites` - User favorite songs
- `user_history` - User view history

#### **Key Features**
- **UUID Primary Keys**: Secure, unique identifiers
- **Foreign Key Relationships**: Data integrity
- **Array Fields**: Tags, lyrics, chords as arrays
- **Timestamps**: Created/updated tracking
- **View Counting**: Analytics and trending

## Development Setup

### **Prerequisites**
- Node.js 18+
- Supabase account
- Git

### **Environment Variables**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **Installation**
```bash
npm install
npm run dev
```

### **Database Setup**
1. Run `supabase/schema.sql` in Supabase SQL Editor
2. Configure storage bucket for thumbnails
3. Set up authentication providers
4. Run migration scripts for sample data

## Key Features for AI Agents

### **When Working on This Project:**

1. **Authentication Context**: Always check if user is authenticated before accessing user-specific features
2. **Language Support**: Consider multi-language requirements for all new features
3. **Mobile Responsiveness**: Ensure all components work on mobile devices
4. **Performance**: Use React hooks efficiently, avoid unnecessary re-renders
5. **Type Safety**: Maintain TypeScript types for all new components
6. **Supabase Integration**: Use existing hooks and API patterns

### **Common Patterns**
- **Custom Hooks**: Use existing patterns for data fetching
- **Error Handling**: Implement proper error states and loading states
- **User Experience**: Maintain consistent UI/UX with Material-UI
- **Data Flow**: Follow the established data flow patterns

### **File Structure Guidelines**
- Components in `components/` directory
- Hooks in `lib/hooks/` directory
- API functions in `lib/api/` directory
- Types in `lib/types.ts`
- Utilities in `lib/` directory

## Deployment

- **Platform**: Vercel (recommended)
- **Database**: Supabase (hosted)
- **Environment**: Production environment variables required
- **Domain**: Custom domain support

## Contributing Guidelines

1. **Code Style**: Follow existing TypeScript and React patterns
2. **Testing**: Test on multiple screen sizes
3. **Performance**: Optimize for large song databases
4. **Accessibility**: Maintain Material-UI accessibility standards
5. **Documentation**: Update this prompt file for new features

## Support & Maintenance

- **Issues**: Check for React 18 compatibility
- **Dependencies**: Keep Material-UI and Supabase updated
- **Performance**: Monitor bundle size and loading times
- **Security**: Regular security updates for dependencies

---

**Note**: This application is designed for Christian worship communities and requires proper Supabase setup for full functionality. The codebase follows modern React patterns and is optimized for both development and production environments.
