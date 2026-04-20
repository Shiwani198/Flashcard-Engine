/**
 * PDF text extraction utility
 *
 * Uses pdf-parse v2 which has a class-based API:
 *   const parser = new PDFParse({ verbosity: 0 });
 *   await parser.load(buffer);        // loads the PDF
 *   const result = await parser.getText(); // extracts text
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse') as { PDFParse: new (opts: { verbosity: number }) => PDFParserInstance };

interface PDFParserInstance {
  load(buffer: Buffer): Promise<void>;
  getText(): Promise<{ text: string; numpages?: number; info?: Record<string, unknown> }>;
  getInfo(): Promise<{ numpages: number; info: Record<string, unknown> }>;
  destroy(): void;
}

async function parsePDF(buffer: Buffer) {
  const parser = new PDFParse({ verbosity: 0 });
  await parser.load(buffer);
  const result = await parser.getText();
  return result;
}

function cleanText(raw: string): string {
  let text = raw;
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/\f/g, '\n\n');
  text = text.split('\n').map((l) => l.trim()).join('\n');
  text = text.split('\n').filter((l) => l.length > 3 || l === '').join('\n');
  return text.trim();
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await parsePDF(buffer);
  return cleanText(data.text);
}

export async function getPDFMetadata(buffer: Buffer): Promise<{ pages: number; title?: string }> {
  const parser = new PDFParse({ verbosity: 0 });
  await parser.load(buffer);
  const info = await parser.getInfo();
  return {
    pages: info.numpages,
    title: (info.info?.Title as string | undefined) || undefined,
  };
}
