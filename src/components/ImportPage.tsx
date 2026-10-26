import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle2, Download, FileSpreadsheet, FileText, Plus, Upload } from 'lucide-react';
import { db } from '../db';
import { detectMapping, fields, importCards, prepareRows, readSpreadsheet, type ImportField, type Mapping } from '../importing';
import { CardForm } from './Library';
import { useToast } from '../ui';
export default function ImportPage({ onPdf }: { onPdf: () => void }) {
  const cards = useLiveQuery(() => db.cards.toArray(), [], []);
  const [sheets, setSheets] = useState<{ name: string; rows: string[][] }[]>([]); const [sheetIndex, setSheetIndex] = useState(0);
  const [mapping, setMapping] = useState<Mapping>({}); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [fileName, setFileName] = useState(''); const [manual, setManual] = useState(false); const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null); const toast = useToast();
  const sheet = sheets[sheetIndex]; const prepared = sheet ? prepareRows(sheet.rows.slice(1), mapping, cards) : []; const valid = prepared.filter(row => !row.issue);
  async function load(file?: File) {
    if (!file || busy) return; setBusy(true); setError(''); setResult(null); setSheets([]); setConfirmed(false);
    try { const data = await readSpreadsheet(file); setSheets(data.sheets); setSheetIndex(0); setMapping(detectMapping(data.sheets[0].rows[0])); setFileName(file.name); }
    catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  async function save() { if (busy || !confirmed) return; setBusy(true); try { setResult(await importCards(prepared)); setSheets([]); toast('Je vragen zijn veilig toegevoegd.'); } catch { setError('Bewaren is niet gelukt. Controleer je vrije opslagruimte en probeer opnieuw.'); } finally { setBusy(false); } }
  return <section>
    <div className="page-heading"><div><p className="eyebrow">Van studietekst naar kennis</p><h1>Vragen toevoegen</h1><p className="muted">Een nieuwe vraag is een nieuw begin.</p></div><button className="button secondary" onClick={() => setManual(true)}><Plus size={18} />Handmatig toevoegen</button></div>
    <div className="import-tabs"><span className="tab-active"><FileSpreadsheet size={19} />Excel of CSV</span><button className="text-button" onClick={onPdf}><FileText size={19} />PDF-document</button></div>
    <div className="section-heading"><h2>Je vragen, klaar om te leren</h2><a className="text-button" href={`${import.meta.env.BASE_URL}voorbeeld-flashcards.xlsx`} download><Download size={17} />Voorbeeldbestand</a></div>
    <div className={`drop-zone ${busy ? 'busy' : ''}`} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void load(event.dataTransfer.files[0]); }}><Upload size={30} /><h3>{busy ? 'Even geduld, Linda...' : 'Kies je Excel- of CSV-bestand'}</h3><p>Sleep je bestand hierheen</p><label className="button primary">Bestand kiezen<input type="file" accept=".xlsx,.csv" aria-label="Excel of CSV kiezen" disabled={busy} onChange={event => { void load(event.target.files?.[0]); event.target.value = ''; }} /></label><span className="muted small-text">.xlsx of .csv · maximaal 15 MB</span></div>
    {error && <p role="alert" className="error">{error}</p>}{result && <div className="result-banner" role="status"><CheckCircle2 size={24} /><div><h3>{result.added} vragen toegevoegd</h3><p>{result.skipped} rijen overgeslagen. Je bestaande kaarten en leerresultaten zijn behouden.</p></div></div>}
    {sheet && <section className="import-review"><p className="eyebrow">{fileName}</p><h2>Controleer je vragen</h2><label>Werkblad<select value={sheetIndex} onChange={event => { const index = Number(event.target.value); setSheetIndex(index); setSheetIndex(index); setMapping(detectMapping(sheets[index].rows[0])); setConfirmed(false); }}>{sheets.map((item, index) => <option value={index} key={index}>{item.name}</option>)}</select></label>
      <div className="mapping-grid">{(Object.entries(fields) as [ImportField, string][]).map(([field, label]) => <label key={field}>{label}{['question', 'answer'].includes(field) ? ' *' : ''}<select value={mapping[field] ?? ''} onChange={event => { setMapping({ ...mapping, [field]: event.target.value === '' ? undefined : Number(event.target.value) }); setConfirmed(false); }}><option value="">Niet gekoppeld</option>{sheet.rows[0].map((header, index) => <option key={index} value={index}>{header || `Kolom ${index + 1}`}</option>)}</select></label>)}</div>
      <div className="row wrap"><span className="tag">{valid.length} geldige vragen</span><span className="tag">{prepared.length - valid.length} overgeslagen</span><span className="muted small-text">Voorbeeld: eerste 10 rijen</span></div>
      <div className="table-scroll"><table><thead><tr><th>Rij</th><th>Vraag</th><th>Antwoord</th><th>Hoofdstuk</th><th>Controle</th></tr></thead><tbody>{prepared.slice(0, 10).map(row => <tr key={row.row}><td>{row.row}</td><td>{row.card.question || '-'}</td><td>{row.card.answer || '-'}</td><td>{row.card.chapter}</td><td>{row.issue || 'In orde'}</td></tr>)}</tbody></table></div>
      {prepared.some(row => row.issue) && <details className="issue-list"><summary>Overgeslagen rijen bekijken ({prepared.length - valid.length})</summary><ul>{prepared.filter(row => row.issue).map(row => <li key={row.row}>Rij {row.row}: {row.issue}</li>)}</ul></details>}
      <label className="checkbox"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Ik heb de koppelingen en voorbeelden gecontroleerd.</label><button className="button primary" disabled={!confirmed || busy || valid.length === 0 || mapping.question === undefined || mapping.answer === undefined} onClick={save}><Plus size={18} />{valid.length} vragen toevoegen</button>
    </section>}{manual && <CardForm onClose={() => setManual(false)} />}
  </section>;
}