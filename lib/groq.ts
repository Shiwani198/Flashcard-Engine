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

const GENERATION_PROMPT = `You are an expert teacher and cognitive scientist specializing in creating highly effective flashcards for deep learning and long-term retention.

Given the following educational content, generate a comprehensive set of flashcards. Cover the material thoroughly — aim for quality over quantity. For each major concept, produce MULTIPLE card types:

- **DEFINITION**: "What is [X]?" → Clear, precise definition
- **CONCEPT**: "How does [X] work?" → Mechanism, process, or explanation  
- **RELATIONSHIP**: "How does [X] relate to [Y]?" → Connections between ideas
- **EXAMPLE**: "Give an example of [X]" → Worked examples with step-by-step solutions (especially for math/science)
- **EDGE_CASE**: "What are the edge cases or exceptions for [X]?" → Where rules break down or special conditions apply

Guidelines for GREAT flashcards:
- Front: A clear, specific question (not vague)
- Back: A complete but concise answer (not a wall of text)
- Cover all key concepts, terms, formulas, relationships
- Include worked examples for any procedures or calculations
- Make cards that would be written by a great teacher, not scraped by a bot
- Aim for 15-40 cards per document depending on complexity

IMPORTANT: Return ONLY valid JSON with no markdown formatting, no code blocks, no explanation — just the raw JSON object.

Format:
{"cards": [{"front": "question here", "back": "answer here", "card_type": "concept", "tags": ["tag1", "tag2"]}]}

Valid card_type values: concept, definition, example, edge_case, relationship

Content to process:
`;

const DEDUP_PROMPT = `You are reviewing a list of flashcards for a study deck. Remove any near-duplicate cards (cards that test the same knowledge in nearly the same way). Keep the better version of each duplicate pair.

Return ONLY the deduplicated cards as valid JSON with no markdown:
{"cards": [{"front": "...", "back": "...", "card_type": "...", "tags": [...]}]}

Cards to deduplicate:
`;

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split text into overlapping chunks that fit within context window
 */
function chunkText(text: string, maxTokensPerChunk = 60000): string[] {
  const estimatedTokens = estimateTokens(text);
  
  if (estimatedTokens <= maxTokensPerChunk) {
    return [text];
  }

  // Split by paragraphs first, then reassemble into chunks
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = '';
  let currentTokens = 0;

  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para);
    
    if (currentTokens + paraTokens > maxTokensPerChunk && currentChunk) {
      chunks.push(currentChunk.trim());
      // Overlap: keep last ~2000 tokens for context
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-500);
      currentChunk = overlapWords.join(' ') + '\n\n' + para;
      currentTokens = estimateTokens(currentChunk);
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
      currentTokens += paraTokens;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Generate flashcards from a single chunk of text
 */
async function generateCardsFromChunk(
  textChunk: string
): Promise<GeneratedCard[]> {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'user',
        content: GENERATION_PROMPT + textChunk,
      },
    ],
    temperature: 0.7,
    max_tokens: 8000,
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return [];

  try {
    const parsed = JSON.parse(content) as GroqCardsResponse;
    return parsed.cards || [];
  } catch {
    console.error('Failed to parse Groq response:', content);
    return [];
  }
}

/**
 * Deduplicate cards using a fast small model
 */
async function deduplicateCards(
  cards: GeneratedCard[]
): Promise<GeneratedCard[]> {
  if (cards.length <= 5) return cards;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'user',
        content: DEDUP_PROMPT + JSON.stringify({ cards }),
      },
    ],
    temperature: 0.3,
    max_tokens: 8000,
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return cards;

  try {
    const parsed = JSON.parse(content) as GroqCardsResponse;
    return parsed.cards?.length ? parsed.cards : cards;
  } catch {
    return cards;
  }
}

/**
 * Main function: generate flashcards from extracted PDF text
 */
export async function generateFlashcards(
  pdfText: string,
  title: string
): Promise<GeneratedCard[]> {
  const chunks = chunkText(pdfText);
  
  console.log(`Generating cards from ${chunks.length} chunk(s) for: ${title}`);

  // Process all chunks in parallel
  const chunkResults = await Promise.all(
    chunks.map((chunk) => generateCardsFromChunk(chunk))
  );

  // Flatten all cards
  const allCards = chunkResults.flat();

  // Deduplicate if we had multiple chunks
  const finalCards = chunks.length > 1
    ? await deduplicateCards(allCards)
    : allCards;

  return finalCards;
}
