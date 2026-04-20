import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { calculateSM2 } from '@/lib/sm2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { card_id, session_id, rating } = body;

    if (!card_id || !session_id || rating === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: card_id, session_id, rating' },
        { status: 400 }
      );
    }

    if (![0, 3, 4, 5].includes(rating)) {
      return NextResponse.json(
        { error: 'Invalid rating. Must be 0, 3, 4, or 5' },
        { status: 400 }
      );
    }

    // Get current progress for this card/session
    const { data: existing } = await supabaseAdmin
      .from('card_progress')
      .select('*')
      .eq('card_id', card_id)
      .eq('session_id', session_id)
      .single();

    // Calculate new SM-2 state
    const newState = calculateSM2(
      existing
        ? {
            ease_factor: existing.ease_factor,
            interval_days: existing.interval_days,
            repetitions: existing.repetitions,
            due_at: existing.due_at,
          }
        : null,
      rating as 0 | 3 | 4 | 5
    );

    // Upsert progress record
    const { error } = await supabaseAdmin.from('card_progress').upsert(
      {
        session_id,
        card_id,
        ease_factor: newState.ease_factor,
        interval_days: newState.interval_days,
        repetitions: newState.repetitions,
        due_at: newState.due_at,
        last_reviewed: newState.last_reviewed,
        last_rating: newState.last_rating,
      },
      { onConflict: 'session_id,card_id' }
    );

    if (error) {
      console.error('Progress upsert error:', error);
      return NextResponse.json(
        { error: 'Failed to save review progress' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      new_state: newState,
    });
  } catch (error) {
    console.error('Review card error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
