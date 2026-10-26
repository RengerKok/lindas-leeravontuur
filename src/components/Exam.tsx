import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Pause, Trophy } from 'lucide-react';
import type { Flashcard, StudySession } from '../types';
import { recordExamAnswer } from '../learning';
import { Meter } from '../ui';
export default function Exam({ session, cards, onPause }: { session: StudySession; cards: Flashcard[]; onPause: () => void }) {
  const index = session.examAnswers?.length || 0; const card = cards.find(item => item.id === session.queue[index]);
  const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const guard = useRef(false); const seconds = useRef(0);
  useEffect(() => { setText(''); seconds.current = 0; }, [index]);
  useEffect(() => { const timer = setInterval(() => { if (!document.hidden) seconds.current++; }, 1000); return () => clearInterval(timer); }, []);
  async function next() { if (guard.current) return; guard.current = true; setBusy(true); setError(''); try { await recordExamAnswer(session.id, index, text || (card ? '' : 'Kaart verwijderd'), seconds.current); } catch (error) { setError((error as Error).message); } finally { setBusy(false); guard.current = false; } }
  return <section className="study-stage"><div className="row between"><button className="text-button" onClick={onPause}><Pause size={17} />Pauzeren</button><span className="eyebrow"><Trophy size={18} />{session.mode === 'boss' ? 'Boss Battle' : 'Examentraining'}</span></div><div className="study-progress"><p>Vraag {index + 1} van {session.goal}</p><Meter value={index / session.goal * 100} label="Quizvoortgang" /></div>
    <article className="study-card"><span className="eyebrow">{card?.subject} · {card?.chapter}</span><div className="question-area"><h2>{card?.question || 'Deze vraag is verwijderd.'}</h2></div><label>Jouw antwoord<textarea rows={5} value={text} maxLength={50000} onChange={event => setText(event.target.value)} autoFocus /></label></article>
    {error && <p className="error" role="alert">{error}</p>}<div className="row end" style={{ marginTop: 20 }}><button className="button primary" disabled={busy} onClick={next}>{index + 1 === session.goal ? 'Naar de beoordeling' : 'Antwoord bewaren'}<ArrowRight size={18} /></button></div>
  </section>;
}