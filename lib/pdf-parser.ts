/**
 * PDF text extraction — pdf-parse v1.1.1
 *
 * v1 API: module.exports is a plain async function.
 *   const pdfParse = require('pdf-parse');
 *   const data = await pdfParse(buffer);
 *   data.text  — full extracted text
 *   data.numpages — page count
 *   data.info  — PDF metadata
 *
 * v1 uses pdfjs-dist 1.x which has NO browser-API dependencies
 * (no DOMMatrix, no Canvas) — works on Vercel serverless, Edge, and local.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

function cleanText(raw: string): string {
  let text = raw;
  text = text.replace(/\n{3,}/g, '\n\n');    // collapse excessive blank lines
  text = text.replace(/\f/g, '\n\n');          // form-feed → paragraph break
  text = text.split('\n').map((l) => l.trim()).join('\n');
  text = text.split('\n').filter((l) => l.length > 3 || l === '').join('\n');
  return text.trim();
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return cleanText(data.text as string);
}

export async function getPDFMetadata(buffer: Buffer): Promise<{ pages: number; title?: string }> {
  const data = await pdfParse(buffer);
  return {
    pages: data.numpages as number,
    title: (data.info?.Title as string | undefined) || undefined,
  };
}
