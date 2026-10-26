import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Copy, Pencil, Plus, Search, Star, Trash2, FolderPlus, ArrowRight } from 'lucide-react';
import { db, nowISO } from '../db';
import { bulkUpdate, saveCard } from '../cards';
import type { Flashcard } from '../types';
import { Empty, Modal, useToast } from '../ui';

export function CardForm({ card, onClose }: { card?: Partial<Flashcard>; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const collections = useLiveQuery(() => db.collections.toArray(), [], []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    try {
      await saveCard({ ...card, question: String(data.get('question')), answer: String(data.get('answer')),
        explanation: String(data.get('explanation')), study: String(data.get('study')).trim() || 'Mijn studie',
        subject: String(data.get('subject')).trim() || 'Algemeen', chapter: String(data.get('chapter')).trim() || 'Hoofdstuk 1',
        topic: String(data.get('topic')).trim(), difficulty: data.get('difficulty') as Flashcard['difficulty'],
        tags: String(data.get('tags')).split(',').map(tag => tag.trim()).filter(Boolean)
      });
      toast(card?.id ? 'Je wijzigingen zijn bewaard.' : 'Je nieuwe vraag is toegevoegd, Linda.'); onClose();
    } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  return <Modal title={card?.id ? 'Flashcard bewerken' : 'Een nieuwe flashcard'} onClose={onClose}>
    <form onSubmit={submit} className="form-stack">
      <label>Vraag<textarea name="question" required maxLength={10000} defaultValue={card?.question} autoFocus rows={3} /></label>
      <label>Antwoord<textarea name="answer" required maxLength={50000} defaultValue={card?.answer} rows={4} /></label>
      <label>Toelichting <span className="muted">(optioneel)</span><textarea name="explanation" defaultValue={card?.explanation} rows={2} /></label>
      <div className="form-grid">{(['study', 'subject', 'chapter', 'topic'] as const).map((field, index) => <label key={field}>
        {['Studie', 'Vak', 'Hoofdstuk', 'Onderwerp'][index]}<input name={field} list={`${field}-options`} defaultValue={card?.[field] || ['Mijn studie', 'Algemeen', 'Hoofdstuk 1', ''][index]} maxLength={200} />
        <datalist id={`${field}-options`}>{[...new Set(collections.filter(item => !item.deleted).map(item => item[field]))].map(value => <option key={value} value={value} />)}</datalist>
      </label>)}</div>
      <div className="form-grid"><label>Moeilijkheid<select name="difficulty" defaultValue={card?.difficulty || 'Gemiddeld'}><option>Makkelijk</option><option>Gemiddeld</option><option>Moeilijk</option></select></label>
      <label>Tags, gescheiden door komma's<input name="tags" defaultValue={card?.tags?.join(', ')} maxLength={500} /></label></div>
      {card?.source && <p className="muted">Bron: {card.source.name}, pagina {card.source.page}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <footer className="row end"><button type="button" className="button secondary" onClick={onClose}>Annuleren</button><button className="button primary" disabled={busy}>{busy ? 'Bewaren...' : 'Flashcard bewaren'}</button></footer>
    </form>
  </Modal>;
}

export default function Library() {
  const cards = useLiveQuery(() => db.cards.toArray(), [], []).filter(card => !card.deleted);
  const collections = useLiveQuery(() => db.collections.toArray(), [], []).filter(item => !item.deleted);
  const [query, setQuery] = useState(''); const [chapter, setChapter] = useState(''); const [subject, setSubject] = useState('');
  const [study, setStudy] = useState(''); const [difficulty, setDifficulty] = useState('');
  const [edit, setEdit] = useState<Partial<Flashcard> | null>(null);
  const [selected, setSelected] = useState<string[]>([]); const [action, setAction] = useState<'delete' | 'move' | 'collection' | null>(null);
  const toast = useToast();
  const filtered = cards.filter(card => (!chapter || card.chapter === chapter) && (!subject || card.subject === subject) && (!study || card.study === study) && (!difficulty || (difficulty === 'extra' ? card.extra : card.difficulty === difficulty)) && `${card.question} ${card.answer} ${card.topic} ${card.tags.join(' ')}`.toLocaleLowerCase('nl').includes(query.toLocaleLowerCase('nl')));
  async function act(task: () => Promise<unknown>) { try { await task(); } catch (error) { toast((error as Error).message); } }
  async function confirmAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    await act(async () => {
      if (action === 'collection') await db.collections.add({ id: crypto.randomUUID(), updatedAt: nowISO(), study: String(data.get('study')), subject: String(data.get('subject')), chapter: String(data.get('chapter')), topic: String(data.get('topic')) });
      else await bulkUpdate(selected, action === 'delete' ? { deleted: true } : { chapter: String(data.get('chapter')).trim() });
      setAction(null); setSelected([]); toast('Opgeslagen.');
    });
  }
  return <section>
    <div className="page-heading"><div><p className="eyebrow">Jouw kennis, op een rij</p><h1>Mijn flashcards</h1><p className="muted">{cards.length} kaarten in je collectie</p></div><button className="button primary" onClick={() => setEdit({})}><Plus size={19} />Nieuwe flashcard</button></div>
    <div className="toolbar"><label className="search"><Search size={19} /><input aria-label="Zoek flashcards" placeholder="Zoek een vraag, antwoord of tag..." value={query} onChange={event => setQuery(event.target.value)} /></label>
      <button className="button secondary" onClick={() => setAction('collection')}><FolderPlus size={18} />Nieuw onderwerp</button></div>
    <div className="filters">
      <select aria-label="Filter studie" value={study} onChange={event => setStudy(event.target.value)}><option value="">Alle studies</option>{[...new Set([...cards, ...collections].map(card => card.study))].map(value => <option key={value}>{value}</option>)}</select>
      <select aria-label="Filter vak" value={subject} onChange={event => setSubject(event.target.value)}><option value="">Alle vakken</option>{[...new Set([...cards, ...collections].map(card => card.subject))].map(value => <option key={value}>{value}</option>)}</select>
      <select aria-label="Filter hoofdstuk" value={chapter} onChange={event => setChapter(event.target.value)}><option value="">Alle hoofdstukken</option>{[...new Set([...cards, ...collections].map(card => card.chapter))].map(value => <option key={value}>{value}</option>)}</select>
      <select aria-label="Filter moeilijkheid" value={difficulty} onChange={event => setDifficulty(event.target.value)}><option value="">Alle moeilijkheden</option><option>Makkelijk</option><option>Gemiddeld</option><option>Moeilijk</option><option value="extra">Extra oefenen</option></select>
    </div>
    {collections.length > 0 && <div className="collection-list">{collections.map(item => <button className="text-button" key={item.id} onClick={() => { setStudy(item.study); setSubject(item.subject); setChapter(item.chapter); }}>{item.study} / {item.subject} / {item.chapter}{item.topic ? ` / ${item.topic}` : ''}<ArrowRight size={14} /></button>)}</div>}
    {filtered.length > 0 ? <><div className="selection-bar"><label className="checkbox"><input type="checkbox" checked={filtered.every(card => selected.includes(card.id))} onChange={event => setSelected(event.target.checked ? filtered.map(card => card.id) : [])} />Alles selecteren ({filtered.length})</label>
      {selected.length > 0 && <div className="row wrap"><span>{selected.length} geselecteerd</span><button className="button small secondary" onClick={() => setAction('move')}>Verplaatsen</button><button className="icon-button" title="Markeer voor extra oefenen" aria-label="Selectie extra oefenen" onClick={() => act(() => bulkUpdate(selected, { extra: true }))}><Star size={18} /></button><button className="icon-button danger" title="Selectie verwijderen" aria-label="Selectie verwijderen" onClick={() => setAction('delete')}><Trash2 size={18} /></button></div>}
    </div><div className="card-list">{filtered.map(card => <article className="library-card" key={card.id}>
      <input type="checkbox" aria-label={`Selecteer ${card.question}`} checked={selected.includes(card.id)} onChange={event => setSelected(event.target.checked ? [...selected, card.id] : selected.filter(id => id !== card.id))} />
      <div className="card-copy"><div className="row wrap"><span className="eyebrow">{card.subject} / {card.chapter}</span><span className="tag">{card.difficulty}</span></div><h3>{card.question}</h3><p>{card.answer}</p>{card.tags.length > 0 && <span className="muted">{card.tags.map(tag => `#${tag}`).join(' ')}</span>}</div>
      <div className="card-tools"><button className={`icon-button ${card.extra ? 'starred' : ''}`} title="Extra oefenen" aria-label={`Extra oefenen: ${card.question}`} aria-pressed={card.extra} onClick={() => act(() => bulkUpdate([card.id], { extra: !card.extra }))}><Star size={18} fill={card.extra ? 'currentColor' : 'none'} /></button>
        <button className="icon-button" title="Bewerken" aria-label={`Bewerk ${card.question}`} onClick={() => setEdit(card)}><Pencil size={18} /></button>
        <button className="icon-button" title="Dupliceren" aria-label={`Dupliceer ${card.question}`} onClick={() => setEdit({ question: `${card.question} (kopie)`, answer: card.answer, explanation: card.explanation, study: card.study, subject: card.subject, chapter: card.chapter, topic: card.topic, difficulty: card.difficulty, tags: card.tags })}><Copy size={18} /></button>
        <button className="icon-button danger" title="Verwijderen" aria-label={`Verwijder ${card.question}`} onClick={() => { setSelected([card.id]); setAction('delete'); }}><Trash2 size={18} /></button>
      </div></article>)}</div></> : <Empty title={cards.length ? 'Geen passende kaarten' : 'Ruimte voor nieuwe kennis'}><p className="muted">{cards.length ? 'Pas je zoekopdracht of filters aan.' : 'Je eerste flashcard begint met een goede vraag.'}</p><button className="button primary" onClick={() => setEdit({})}><Plus size={18} />Vraag toevoegen</button></Empty>}
    {edit && <CardForm card={edit} onClose={() => setEdit(null)} />}
    {action && <Modal title={action === 'delete' ? 'Flashcards verwijderen?' : action === 'move' ? 'Verplaatsen naar hoofdstuk' : 'Nieuw studieonderwerp'} onClose={() => setAction(null)}><form className="form-stack" onSubmit={confirmAction}>
      {action === 'delete' ? <p>Je verwijdert {selected.length} flashcard(s). Je oefenhistorie blijft bewaard. Maak bij twijfel eerst een back-up.</p> : <>{action === 'collection' && <><label>Studie<input name="study" required defaultValue={study || 'Mijn studie'} /></label><label>Vak<input name="subject" required defaultValue={subject || 'Algemeen'} /></label></>}<label>Hoofdstuk<input name="chapter" required maxLength={200} /></label>{action === 'collection' && <label>Onderwerp<input name="topic" maxLength={200} /></label>}</>}
      <footer className="row end"><button type="button" className="button secondary" onClick={() => setAction(null)}>Annuleren</button><button className={`button ${action === 'delete' ? 'danger-fill' : 'primary'}`}>{action === 'delete' ? 'Verwijderen' : 'Bewaren'}</button></footer>
    </form></Modal>}
  </section>;
}