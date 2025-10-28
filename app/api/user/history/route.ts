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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const { data: history, error } = await supabase
      .from('user_history')
      .select(`
        song_id,
        viewed_at,
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
      .order('viewed_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching history:', error)
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }

    // Transform data to match frontend interface
    const transformedHistory = history?.map(item => ({
      id: item.songs.id,
      title: item.songs.title,
      titleTransliteration: item.songs.title_transliteration,
      language: item.songs.language,
      thumbnail: item.songs.thumbnail_url,
      viewedAt: item.viewed_at,
      artist: {
        id: item.songs.artists.id,
        name: item.songs.artists.name,
        photoUrl: item.songs.artists.photo_url,
      }
    })) || []

    return NextResponse.json({ history: transformedHistory })
  } catch (error) {
    console.error('Error in history GET API:', error)
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

    // Use upsert to either insert or update the viewed_at timestamp
    const { data: historyItem, error } = await supabase
      .from('user_history')
      .upsert({
        user_id: user.id,
        song_id: songId,
        viewed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding to history:', error)
      return NextResponse.json({ error: 'Failed to add to history' }, { status: 500 })
    }

    return NextResponse.json({ historyItem }, { status: 201 })
  } catch (error) {
    console.error('Error in history POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
