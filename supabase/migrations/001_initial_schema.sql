-- Flashcard Engine Database Schema
-- Run this in Supabase SQL Editor

-- Decks table
CREATE TABLE IF NOT EXISTS decks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  TEXT NOT NULL,
  title       TEXT NOT NULL,
  pdf_name    TEXT,
  description TEXT,
  card_count  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Cards table
CREATE TABLE IF NOT EXISTS cards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id     UUID REFERENCES decks(id) ON DELETE CASCADE,
  front       TEXT NOT NULL,
  back        TEXT NOT NULL,
  card_type   TEXT DEFAULT 'concept' CHECK (card_type IN ('concept', 'definition', 'example', 'edge_case', 'relationship')),
  tags        TEXT[],
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Card progress (SM-2 state) per session per card
CREATE TABLE IF NOT EXISTS card_progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    TEXT NOT NULL,
  card_id       UUID REFERENCES cards(id) ON DELETE CASCADE,
  ease_factor   FLOAT DEFAULT 2.5,
  interval_days INT DEFAULT 1,
  repetitions   INT DEFAULT 0,
  due_at        TIMESTAMPTZ DEFAULT now(),
  last_reviewed TIMESTAMPTZ,
  last_rating   INT,
  UNIQUE(session_id, card_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_decks_session ON decks(session_id);
CREATE INDEX IF NOT EXISTS idx_decks_created ON decks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cards_deck ON cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_progress_session ON card_progress(session_id);
CREATE INDEX IF NOT EXISTS idx_progress_due ON card_progress(due_at);
CREATE INDEX IF NOT EXISTS idx_progress_card ON card_progress(card_id);

-- Auto-update updated_at on decks
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER decks_updated_at
  BEFORE UPDATE ON decks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
