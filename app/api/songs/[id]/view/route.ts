import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { id } = params

    // Increment view count
    const { data: song, error } = await supabase
      .from('songs')
      .update({
        view_count: supabase.raw('view_count + 1'),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('view_count')
      .single()

    if (error) {
      console.error('Error updating view count:', error)
      return NextResponse.json({ error: 'Failed to update view count' }, { status: 500 })
    }

    return NextResponse.json({ viewCount: song.view_count })
  } catch (error) {
    console.error('Error in view count API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
