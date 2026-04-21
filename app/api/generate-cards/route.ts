import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { extractTextFromPDF } from '@/lib/pdf-parser';
import { generateFlashcards } from '@/lib/groq';

export const maxDuration = 120; // 2 minutes for large PDFs

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string;
    const sessionId = formData.get('session_id') as string;

    if (!file || !title || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, title, session_id' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Max 20MB
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 20MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text from PDF
    const pdfText = await extractTextFromPDF(buffer);

    if (!pdfText || pdfText.length < 100) {
      return NextResponse.json(
        { error: 'Could not extract text from PDF. Make sure it is a text-based PDF (not scanned).' },
        { status: 422 }
      );
    }

    // Generate flashcards via Groq
    const generatedCards = await generateFlashcards(pdfText, title);

    if (!generatedCards || generatedCards.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate flashcards. Please try again.' },
        { status: 500 }
      );
    }

    // Create deck in database
    const { data: deck, error: deckError } = await supabaseAdmin
      .from('decks')
      .insert({
        session_id: sessionId,
        title: title.trim(),
        pdf_name: file.name,
        description: `Generated from ${file.name}`,
        card_count: generatedCards.length,
      })
      .select()
      .single();

    if (deckError || !deck) {
      console.error('Deck insert error:', deckError);
      return NextResponse.json(
        { error: 'Failed to save deck to database' },
        { status: 500 }
      );
    }

    // Insert all cards
    const cardsToInsert = generatedCards.map((card) => ({
      deck_id: deck.id,
      front: card.front,
      back: card.back,
      card_type: card.card_type,
      tags: card.tags || [],
    }));

    const { error: cardsError } = await supabaseAdmin
      .from('cards')
      .insert(cardsToInsert);

    if (cardsError) {
      console.error('Cards insert error:', cardsError);
      // Rollback deck
      await supabaseAdmin.from('decks').delete().eq('id', deck.id);
      return NextResponse.json(
        { error: 'Failed to save cards to database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deck_id: deck.id,
      card_count: generatedCards.length,
    });
  } catch (error) {
    console.error('Generate cards error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
