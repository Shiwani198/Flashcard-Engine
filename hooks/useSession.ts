'use client';

import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = 'flashcard_session_id';

/**
 * Returns a stable anonymous session ID stored in localStorage.
 * Generated once on first visit, persists across browser sessions.
 */
export function useSession(): string | null {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = uuidv4();
      localStorage.setItem(SESSION_KEY, id);
    }
    setSessionId(id);
  }, []);

  return sessionId;
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}
