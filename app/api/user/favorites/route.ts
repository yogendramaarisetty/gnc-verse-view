import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: favorites, error } = await supabase
      .from('user_favorites')
      .select(`
        song_id,
        songs (
          id,
          title,
          title_transliteration,
          language,
          thumbnail_url,
          artists (
            id,
            name,
            photo_url
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching favorites:', error)
      return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 })
    }

    // Transform data to match frontend interface
    const transformedFavorites = favorites?.map(fav => ({
      id: fav.songs.id,
      title: fav.songs.title,
      titleTransliteration: fav.songs.title_transliteration,
      language: fav.songs.language,
      thumbnail: fav.songs.thumbnail_url,
      artist: {
        id: fav.songs.artists.id,
        name: fav.songs.artists.name,
        photoUrl: fav.songs.artists.photo_url,
      }
    })) || []

    return NextResponse.json({ favorites: transformedFavorites })
  } catch (error) {
    console.error('Error in favorites GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { songId } = await request.json()

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 })
    }

    const { data: favorite, error } = await supabase
      .from('user_favorites')
      .insert({
        user_id: user.id,
        song_id: songId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding favorite:', error)
      return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 })
    }

    return NextResponse.json({ favorite }, { status: 201 })
  } catch (error) {
    console.error('Error in favorites POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const songId = searchParams.get('songId')

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('song_id', songId)

    if (error) {
      console.error('Error removing favorite:', error)
      return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Favorite removed successfully' })
  } catch (error) {
    console.error('Error in favorites DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
