import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc = workerUrl;
type PdfPage = Awaited<ReturnType<PDFDocumentProxy['getPage']>>;
type TextContent = Awaited<ReturnType<PdfPage['getTextContent']>>;
export function pageText(content: TextContent): string { return content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('').trim(); }
export interface LocalPdf { numPages: number; getPage: PDFDocumentProxy['getPage']; destroy: () => Promise<void> }
export async function openPdf(file: File): Promise<LocalPdf> {
  if (file.size > 50 * 1024 * 1024) throw new Error('Kies een PDF van maximaal 50 MB. Splits grotere documenten eerst op.');
  if (!file.name.toLowerCase().endsWith('.pdf')) throw new Error('Kies een PDF-bestand.');
  const task = getDocument({ data: await file.arrayBuffer(), useSystemFonts: true });
  return new Promise((resolve, reject) => {
    task.onPassword = () => { reject(new Error('Deze PDF is beveiligd. Maak eerst met toestemming een ontgrendelde kopie.')); void task.destroy(); };
    task.promise.then(pdf => resolve({ numPages: pdf.numPages, getPage: pdf.getPage.bind(pdf), destroy: () => task.destroy() }), () => { void task.destroy(); reject(new Error('De PDF kon niet worden gelezen. Controleer of het bestand volledig en geldig is.')); });
  });
}
export function selectedFragment(text: string, start: number, end: number) { return text.slice(Math.max(0, start), Math.min(text.length, end)).trim(); }
export interface QuestionDraft { question: string; answer: string; explanation?: string }
export interface LocalQuestionGenerator { available(): Promise<boolean>; generate(text: string, signal?: AbortSignal): Promise<QuestionDraft[]> }
export async function generateDrafts(provider: LocalQuestionGenerator, text: string, signal?: AbortSignal) {
  if (!await provider.available()) throw new Error('Deze lokale vraaggenerator is niet beschikbaar op dit apparaat.');
  return (await provider.generate(text, signal)).filter(draft => draft.question.trim() && draft.answer.trim());
}