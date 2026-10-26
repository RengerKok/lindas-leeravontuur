import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, FileText, Plus, X } from 'lucide-react';
import { openPdf, pageText, selectedFragment, type LocalPdf } from '../pdf';
import { CardForm } from './Library';
import type { Flashcard } from '../types';
import '../pdf.css';
export default function PdfImport({ onBack }: { onBack: () => void }) {
  const documentRef = useRef<LocalPdf | null>(null); const generation = useRef(0); const textRef = useRef<HTMLTextAreaElement>(null);
  const [name, setName] = useState(''); const [pages, setPages] = useState(0); const [page, setPage] = useState(1);
  const [text, setText] = useState(''); const [fragment, setFragment] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [draft, setDraft] = useState<Partial<Flashcard> | null>(null);
  useEffect(() => () => { generation.current++; void documentRef.current?.destroy(); }, []);
  async function showPage(number: number, pdf = documentRef.current) {
    if (!pdf) return; const token = ++generation.current; setBusy(true); setError(''); setFragment(''); setText('');
    try { const pdfPage = await pdf.getPage(number); const content = pageText(await pdfPage.getTextContent()); pdfPage.cleanup(); if (generation.current !== token) return; setText(content); setPage(number); if (!content) setError('Deze pagina bevat geen uitleesbare tekst. Kies een andere pagina. Voor scans is eerst OCR nodig.'); }
    catch { if (generation.current === token) setError('Deze pagina kon niet worden gelezen.'); } finally { if (generation.current === token) setBusy(false); }
  }
  async function load(file?: File) {
    if (!file || busy) return; setBusy(true); setError(''); setText(''); setFragment(''); setPages(0); const token = ++generation.current;
    try { await documentRef.current?.destroy(); const pdf = await openPdf(file); if (token !== generation.current) { await pdf.destroy(); return; } documentRef.current = pdf; setName(file.name); setPages(pdf.numPages); await showPage(1, pdf); }
    catch (error) { setError((error as Error).message); setBusy(false); }
  }
  function select() { if (textRef.current) setFragment(selectedFragment(text, textRef.current.selectionStart, textRef.current.selectionEnd)); }
  return <section><div className="page-heading"><div><p className="eyebrow">Jouw eigen studiemateriaal</p><h1>Vragen uit een PDF</h1><p className="muted">Van een belangrijk stukje tekst naar een goede vraag.</p></div><button className="text-button" onClick={onBack}><ArrowLeft size={17} />Excel of CSV</button></div>
    <div className="drop-zone" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void load(event.dataTransfer.files[0]); }}><FileText size={30} /><h3>{busy ? 'Je document wordt gelezen...' : 'Open je studiedocument'}</h3><label className="button primary">PDF kiezen<input type="file" accept=".pdf" aria-label="PDF kiezen" disabled={busy} onChange={event => { void load(event.target.files?.[0]); event.target.value = ''; }} /></label><span className="small-text muted">PDF · maximaal 50 MB · blijft op je apparaat</span></div>
    {error && <p className="error" role="alert">{error}</p>}{pages > 0 && <><div className="pdf-toolbar"><span className="muted small-text">{name}</span><div className="row"><button className="icon-button" title="Vorige pagina" aria-label="Vorige pagina" disabled={busy || page <= 1} onClick={() => showPage(page - 1)}><ArrowLeft size={19} /></button><label>Pagina<select aria-label="PDF-pagina" value={page} disabled={busy} onChange={event => showPage(Number(event.target.value))}>{Array.from({ length: pages }, (_, index) => <option key={index} value={index + 1}>{index + 1} van {pages}</option>)}</select></label><button className="icon-button" title="Volgende pagina" aria-label="Volgende pagina" disabled={busy || page >= pages} onClick={() => showPage(page + 1)}><ArrowRight size={19} /></button></div></div>
      <label className="pdf-text-label">Paginatekst<textarea ref={textRef} className="pdf-text" value={text} readOnly rows={15} onSelect={select} onPointerUp={select} onKeyUp={select} aria-label="Tekst van de PDF-pagina" /></label>
      <div className="pdf-selection"><h3>{fragment ? 'Je geselecteerde fragment' : 'Nog geen fragment geselecteerd'}</h3>{fragment && <blockquote>{fragment}</blockquote>}<div className="row wrap"><button className="button primary" disabled={!fragment} onClick={() => setDraft({ answer: fragment, source: { name, page } })}><Plus size={18} />Vraag van selectie maken</button><button className="text-button" disabled={!text} onClick={() => setDraft({ answer: text, source: { name, page } })}>Hele paginatekst gebruiken</button><button className="icon-button" aria-label="Document sluiten" title="Document sluiten" onClick={() => { generation.current++; void documentRef.current?.destroy(); documentRef.current = null; setPages(0); setText(''); }}><X size={18} /></button></div></div>
    </>}{draft && <CardForm card={draft} onClose={() => setDraft(null)} />}</section>;
}