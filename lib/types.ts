export interface Deck {
  id: string;
  session_id: string;
  title: string;
  pdf_name?: string;
  description?: string;
  card_count: number;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  card_type: 'concept' | 'definition' | 'example' | 'edge_case' | 'relationship';
  tags: string[];
  created_at: string;
}

export interface CardProgress {
  id: string;
  session_id: string;
  card_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  due_at: string;
  last_reviewed?: string;
  last_rating?: number;
}

export interface CardWithProgress extends Card {
  progress?: CardProgress;
}

export interface DeckStats {
  total: number;
  new: number;
  learning: number;
  review: number;
  mastered: number;
  due_today: number;
}

export interface ReviewRating {
  label: 'Again' | 'Hard' | 'Good' | 'Easy';
  value: 0 | 3 | 4 | 5;
  color: string;
  emoji: string;
}

export const REVIEW_RATINGS: ReviewRating[] = [
  { label: 'Again', value: 0, color: 'bg-red-500 hover:bg-red-400', emoji: '😵' },
  { label: 'Hard', value: 3, color: 'bg-orange-500 hover:bg-orange-400', emoji: '😐' },
  { label: 'Good', value: 4, color: 'bg-blue-500 hover:bg-blue-400', emoji: '🙂' },
  { label: 'Easy', value: 5, color: 'bg-emerald-500 hover:bg-emerald-400', emoji: '🚀' },
];
