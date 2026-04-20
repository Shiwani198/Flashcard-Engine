import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// GET all decks for a session
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  const { data: decks, error } = await supabaseAdmin
    .from('decks')
    .select('*')
    .eq('session_id', sessionId)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ decks });
}

// DELETE a deck
export async function DELETE(request: NextRequest) {
  const deckId = request.nextUrl.searchParams.get('id');
  const sessionId = request.nextUrl.searchParams.get('session_id');

  if (!deckId || !sessionId) {
    return NextResponse.json(
      { error: 'Missing id or session_id' },
      { status: 400 }
    );
  }

  // Verify ownership
  const { data: deck } = await supabaseAdmin
    .from('decks')
    .select('session_id')
    .eq('id', deckId)
    .single();

  if (!deck || deck.session_id !== sessionId) {
    return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from('decks').delete().eq('id', deckId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// PATCH - rename deck
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, session_id, title } = body;

  if (!id || !session_id || !title) {
    return NextResponse.json(
      { error: 'Missing id, session_id, or title' },
      { status: 400 }
    );
  }

  // Verify ownership
  const { data: deck } = await supabaseAdmin
    .from('decks')
    .select('session_id')
    .eq('id', id)
    .single();

  if (!deck || deck.session_id !== session_id) {
    return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from('decks')
    .update({ title: title.trim() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deck: data });
}
