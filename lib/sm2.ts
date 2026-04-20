/**
 * SM-2 Spaced Repetition Algorithm
 * Based on the SuperMemo SM-2 algorithm
 * Rating scale: 0=Again, 3=Hard, 4=Good, 5=Easy
 */

export interface SM2State {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  due_at: string; // ISO date string
}

export interface SM2Result extends SM2State {
  last_rating: number;
  last_reviewed: string;
}

const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

/**
 * Calculate new SM-2 state after a review
 * @param current - Current SM-2 state (null for first review)
 * @param rating - Quality rating: 0 (Again), 3 (Hard), 4 (Good), 5 (Easy)
 */
export function calculateSM2(
  current: SM2State | null,
  rating: 0 | 3 | 4 | 5
): SM2Result {
  const now = new Date();

  const easeFactor = current?.ease_factor ?? DEFAULT_EASE;
  const repetitions = current?.repetitions ?? 0;
  const intervalDays = current?.interval_days ?? 1;

  let newRepetitions: number;
  let newInterval: number;
  let newEaseFactor: number;

  if (rating >= 3) {
    // Card passed
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(intervalDays * easeFactor);
    }
    newRepetitions = repetitions + 1;
  } else {
    // Card failed (Again)
    newRepetitions = 0;
    newInterval = 1;
  }

  // Update ease factor based on rating quality
  newEaseFactor =
    easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
  newEaseFactor = Math.max(MIN_EASE, newEaseFactor);

  const dueAt = new Date(now);
  dueAt.setDate(dueAt.getDate() + newInterval);

  return {
    ease_factor: newEaseFactor,
    interval_days: newInterval,
    repetitions: newRepetitions,
    due_at: dueAt.toISOString(),
    last_rating: rating,
    last_reviewed: now.toISOString(),
  };
}

/**
 * Get mastery level label based on interval
 */
export function getMasteryLabel(intervalDays: number): 'new' | 'learning' | 'review' | 'mastered' {
  if (intervalDays <= 1) return 'new';
  if (intervalDays <= 7) return 'learning';
  if (intervalDays <= 21) return 'review';
  return 'mastered';
}

/**
 * Get mastery color class based on interval
 */
export function getMasteryColor(intervalDays: number): string {
  const level = getMasteryLabel(intervalDays);
  const colors = {
    new: 'text-slate-400',
    learning: 'text-amber-400',
    review: 'text-blue-400',
    mastered: 'text-emerald-400',
  };
  return colors[level];
}

/**
 * Check if a card is due for review
 */
export function isDue(dueAt: string): boolean {
  return new Date(dueAt) <= new Date();
}
