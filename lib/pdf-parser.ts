/**
 * PDF text extraction — pdf-parse v2
 *
 * v2 API (discovered by inspecting the installed module):
 *   const parser = new PDFParse({ verbosity: 0, data: buffer });
 *   await parser.load();          ← loads using this.options (which contains data)
 *   const result = await parser.getText();
 *
 * The `data` field is passed in the constructor options, NOT to load().
 * The library internally converts Buffer → Uint8Array automatically.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse') as {
  PDFParse: new (opts: { verbosity: number; data: Buffer }) => PDFParserInstance;
};

interface PDFParserInstance {
  load(): Promise<unknown>;
  getText(): Promise<{ text: string }>;
  getInfo(): Promise<{ numpages: number; info: Record<string, unknown> }>;
  destroy(): Promise<void>;
}

async function parsePDF(buffer: Buffer): Promise<{ text: string }> {
  const parser = new PDFParse({ verbosity: 0, data: buffer });
  await parser.load();
  const result = await parser.getText();
  return result;
}

function cleanText(raw: string): string {
  let text = raw;
  text = text.replace(/\n{3,}/g, '\n\n');   // collapse 3+ blank lines
  text = text.replace(/\f/g, '\n\n');         // form-feed → paragraph break
  text = text.split('\n').map((l) => l.trim()).join('\n');
  text = text.split('\n').filter((l) => l.length > 3 || l === '').join('\n');
  return text.trim();
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await parsePDF(buffer);
  return cleanText(data.text);
}

export async function getPDFMetadata(buffer: Buffer): Promise<{ pages: number; title?: string }> {
  const parser = new PDFParse({ verbosity: 0, data: buffer });
  await parser.load();
  const info = await parser.getInfo();
  return {
    pages: info.numpages,
    title: (info.info?.Title as string | undefined) || undefined,
  };
}
