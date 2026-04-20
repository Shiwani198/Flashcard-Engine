import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export interface GeneratedCard {
  front: string;
  back: string;
  card_type: 'concept' | 'definition' | 'example' | 'edge_case' | 'relationship';
  tags: string[];
}

interface GroqCardsResponse {
  cards: GeneratedCard[];
}

// ── Groq free tier limits ──────────────────────────────────────────────────
// TPM limit: 12,000 tokens/min on the free tier.
// Prompt header ≈ 350 tokens, response max 2,000 tokens → safe content budget ≈ 5,500 tokens.
// 1 token ≈ 4 chars → max chunk ≈ 22,000 chars of content.
// We also cap the total text at MAX_TOTAL_CHARS before chunking.
const MAX_CHUNK_TOKENS  = 5500;   // content tokens per single API call
const MAX_TOTAL_CHARS   = 60_000; // hard cap on total text fed to the model (~15k tokens)

const GENERATION_PROMPT = `You are an expert teacher creating flashcards for deep learning and long-term retention.

Given the educational content below, generate a well-rounded set of flashcards:
- DEFINITION: "What is [X]?" → precise definition
- CONCEPT: "How does [X] work?" → mechanism or explanation
- RELATIONSHIP: "How does [X] relate to [Y]?" → connections
- EXAMPLE: "Give an example of [X]" → worked step-by-step examples (especially for math/science)
- EDGE_CASE: "What are edge cases for [X]?" → exceptions or special conditions

Rules:
- Front: clear, specific question
- Back: complete but concise answer
- Aim for 10-25 cards per chunk
- Return ONLY valid JSON, no markdown, no code blocks

Format: {"cards": [{"front": "...", "back": "...", "card_type": "concept", "tags": ["tag1"]}]}
Valid card_type values: concept, definition, example, edge_case, relationship

Content:
`;

const DEDUP_PROMPT = `Remove near-duplicate flashcards. Keep the better version of each duplicate pair.
Return ONLY valid JSON: {"cards": [{"front": "...", "back": "...", "card_type": "...", "tags": [...]}]}

Cards:
`;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to MAX_TOTAL_CHARS, cutting at a paragraph boundary.
 * This prevents enormous PDFs from blowing up the token budget.
 */
function truncateText(text: string): string {
  if (text.length <= MAX_TOTAL_CHARS) return text;
  const truncated = text.slice(0, MAX_TOTAL_CHARS);
  // Cut at the last paragraph break to avoid mid-sentence truncation
  const lastBreak = truncated.lastIndexOf('\n\n');
  return lastBreak > MAX_TOTAL_CHARS * 0.7 ? truncated.slice(0, lastBreak) : truncated;
}

/**
 * Split text into chunks that each fit within MAX_CHUNK_TOKENS.
 * Chunks are processed sequentially (not in parallel) to respect TPM limits.
 */
function chunkText(text: string): string[] {
  const safe = truncateText(text);
  if (estimateTokens(safe) <= MAX_CHUNK_TOKENS) return [safe];

  const paragraphs = safe.split(/\n\n+/);
  const chunks: string[] = [];
  let current = '';
  let currentTokens = 0;

  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para);
    if (currentTokens + paraTokens > MAX_CHUNK_TOKENS && current) {
      chunks.push(current.trim());
      current = para;
      currentTokens = paraTokens;
    } else {
      current += (current ? '\n\n' : '') + para;
      currentTokens += paraTokens;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/**
 * Sleep for `ms` milliseconds — used for rate-limit backoff.
 */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate flashcards from one chunk, with exponential-backoff retry on 413/429.
 */
async function generateCardsFromChunk(
  textChunk: string,
  attempt = 0
): Promise<GeneratedCard[]> {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: GENERATION_PROMPT + textChunk }],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return [];

    try {
      const parsed = JSON.parse(content) as GroqCardsResponse;
      return parsed.cards || [];
    } catch {
      console.error('Failed to parse Groq response:', content.slice(0, 200));
      return [];
    }
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    // Rate limit (429) or request too large (413)
    if ((status === 429 || status === 413) && attempt < 4) {
      // Parse retry-after header if available, else use exponential backoff
      const retryAfter = (err as { headers?: Record<string, string> })?.headers?.['retry-after'];
      const waitMs = retryAfter
        ? parseInt(retryAfter) * 1000 + 500
        : Math.min(2 ** attempt * 3000, 30000); // 3s, 6s, 12s, 24s
      console.log(`Rate limit hit (attempt ${attempt + 1}), waiting ${waitMs}ms…`);
      await sleep(waitMs);
      return generateCardsFromChunk(textChunk, attempt + 1);
    }
    throw err;
  }
}

/**
 * Deduplicate cards using the fast 8b model (much cheaper on tokens).
 * Only runs if there were multiple chunks.
 */
async function deduplicateCards(cards: GeneratedCard[]): Promise<GeneratedCard[]> {
  if (cards.length <= 5) return cards;
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: DEDUP_PROMPT + JSON.stringify({ cards }) }],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) return cards;
    const parsed = JSON.parse(content) as GroqCardsResponse;
    return parsed.cards?.length ? parsed.cards : cards;
  } catch {
    return cards; // dedup is best-effort — don't fail the whole generation
  }
}

/**
 * Main entry point: generate flashcards from extracted PDF text.
 * Chunks are processed SEQUENTIALLY to stay within Groq TPM limits.
 */
export async function generateFlashcards(
  pdfText: string,
  title: string
): Promise<GeneratedCard[]> {
  const chunks = chunkText(pdfText);
  console.log(
    `Generating cards from ${chunks.length} chunk(s) for: ${title} ` +
    `(text: ${pdfText.length} chars → ${chunks.map((c) => estimateTokens(c)).join(', ')} tokens/chunk)`
  );

  // Sequential processing to avoid simultaneous TPM bursts
  const allCards: GeneratedCard[] = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing chunk ${i + 1}/${chunks.length}…`);
    const cards = await generateCardsFromChunk(chunks[i]);
    allCards.push(...cards);
    // Brief pause between chunks to stay within per-minute limits
    if (i < chunks.length - 1) await sleep(2000);
  }

  const finalCards = chunks.length > 1 ? await deduplicateCards(allCards) : allCards;
  console.log(`Generated ${finalCards.length} cards total for: ${title}`);
  return finalCards;
}
