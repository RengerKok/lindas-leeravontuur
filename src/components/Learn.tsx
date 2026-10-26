import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, ArrowRight, BookOpen, Check, Clock, Eye, GraduationCap, Pause, Play, Shuffle, Star, Trophy, X, Zap } from 'lucide-react';
import { db } from '../db';
import { answerCard, chapterKey, finishSession, startSession } from '../learning';
import { bulkUpdate } from '../cards';
import type { Grade, Mode, StudySession } from '../types';
import { Empty, Mascot, Meter, useToast } from '../ui';
import { motivations } from '../stats';
import '../learning.css';
import Exam from './Exam';
export default function Learn({ initialMode = 'normal' }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode); const [activeId, setActiveId] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false); const [busy, setBusy] = useState(false); const guard = useRef(false);
  const [error, setError] = useState(''); const [chapter, setChapter] = useState('');
  const [timerMinutes, setTimerMinutes] = useState(15); const [chapters, setChapters] = useState<string[]>([]);
  const [activeSeconds, setActiveSeconds] = useState(0); const toast = useToast(); const revealRef = useRef<HTMLButtonElement>(null);
  const cards = useLiveQuery(() => db.cards.toArray(), [], []).filter(card => !card.deleted);
  const chapterOptions = [...new Map(cards.map(card => [chapterKey(card), `${card.study} / ${card.subject} / ${card.chapter}`])).entries()];
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], []);
  const reviews = useLiveQuery(() => db.reviews.toArray(), [], []);
  const session = sessions.find(item => item.id === activeId); const card = cards.find(item => item.id === session?.queue[session.cursor]);
  const resumable = sessions.filter(item => !item.completed).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const examCollecting = !!session && ['exam', 'boss'].includes(session.mode) && (session.examAnswers?.length || 0) < session.goal;
  const remaining = session?.timerMinutes ? Math.max(0, session.timerMinutes * 60 - reviews.filter(review => review.sessionId === session.id).reduce((total, review) => total + review.seconds, 0) - activeSeconds) : null;
  useEffect(() => { setShowAnswer(false); setActiveSeconds(0); revealRef.current?.focus(); }, [session?.id, session?.cursor]);
  useEffect(() => { if (!session || session.completed || examCollecting) return; const timer = setInterval(() => { if (!document.hidden) setActiveSeconds(value => value + 1); }, 1000); return () => clearInterval(timer); }, [session?.id, session?.completed, examCollecting]);
  async function begin() { if (guard.current) return; guard.current = true; setBusy(true); setError(''); try { setActiveId((await startSession(mode, mode === 'exam' || mode === 'mix' ? '' : chapter, mode === 'focus' ? timerMinutes : 0, mode === 'exam' ? chapters : [])).id); } catch (error) { setError((error as Error).message); } finally { setBusy(false); guard.current = false; } }
  async function grade(value: Grade) {
    if (!session || !showAnswer || guard.current) return; guard.current = true; setBusy(true);
    try { const quizTime = session.cursor < session.goal ? session.examAnswers?.find(answer => answer.cardId === card?.id)?.seconds || 0 : 0; await answerCard(session.id, session.cursor, value, activeSeconds + quizTime); setShowAnswer(false); }
    catch { toast('Opslaan is niet gelukt. Je kunt deze vraag opnieuw beoordelen.'); } finally { guard.current = false; setBusy(false); }
  }
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement)?.tagName)) return;
      if (!session || session.completed || busy || examCollecting) return;
      if (event.code === 'Space' && !showAnswer) { event.preventDefault(); setShowAnswer(true); }
      if (showAnswer && ['1', '2', '3'].includes(event.key)) { event.preventDefault(); void grade(event.key === '1' ? 'again' : event.key === '2' ? 'hard' : 'good'); }
    }; window.addEventListener('keydown', handleKey); return () => window.removeEventListener('keydown', handleKey);
  });
  if (session?.completed) return <SessionResult session={session} onClose={() => setActiveId(null)} />;
  if (session && examCollecting) return <Exam session={session} cards={cards} onPause={() => setActiveId(null)} />;
  if (session && !card) return <Empty title="Deze kaart is niet meer beschikbaar"><button className="button primary" onClick={async () => { await answerCard(session.id, session.cursor, 'good'); }}>Volgende vraag<ArrowRight size={18} /></button><button className="text-button" onClick={() => setActiveId(null)}>Terug</button></Empty>;
  if (session && card) return <section className="study-stage">
    {remaining !== null && <div className="focus-timer" role="timer" aria-label="Resterende focustijd"><Clock size={18} />{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}{remaining === 0 && <span>Je focusmoment zit erop. Rond af wanneer je wilt.</span>}</div>}
    <div className="row between"><button className="text-button" onClick={() => setActiveId(null)}><Pause size={17} />Pauzeren</button><span className="eyebrow">{session.mode === 'difficult' ? 'Extra aandacht' : 'Jouw leermoment'}</span><button className="text-button" onClick={() => finishSession(session.id)}>Afronden</button></div>
    <div className="study-progress"><div className="row between"><span>Vraag {session.cursor + 1} van {session.queue.length}</span><span>{session.answers} beantwoord</span></div><Meter value={session.cursor / session.queue.length * 100} label="Sessievoortgang" /></div>
    <article className={`study-card ${showAnswer ? 'revealed' : ''}`} key={`${session.id}:${session.cursor}`}>
      <div className="row between"><span className="eyebrow">{card.subject} · {card.chapter}</span><button className={`icon-button ${card.extra ? 'starred' : ''}`} title="Extra oefenen" aria-label="Deze kaart extra oefenen" aria-pressed={card.extra} onClick={() => bulkUpdate([card.id], { extra: !card.extra })}><Star size={20} fill={card.extra ? 'currentColor' : 'none'} /></button></div>
      <div className="question-area"><span className="eyebrow">De vraag</span><h2>{card.question}</h2></div>
      {session.examAnswers && <div className="exam-own-answer"><span className="eyebrow">Jouw quizantwoord</span><p>{session.examAnswers.find(answer => answer.cardId === card.id)?.text}</p></div>}
      {showAnswer ? <div className="answer-area" aria-live="polite"><span className="eyebrow">Het antwoord</span><p>{card.answer}</p>{card.explanation && <p className="explanation">{card.explanation}</p>}{card.source && <span className="muted small-text">{card.source.name} · pagina {card.source.page}</span>}</div> : <button ref={revealRef} className="button primary reveal-button" onClick={() => setShowAnswer(true)}><Eye size={20} />Toon antwoord</button>}
    </article>
    {showAnswer && <div className="grading" role="group" aria-label="Hoe ging deze vraag?"><button className="grade good" disabled={busy} onClick={() => grade('good')}><Check size={23} />Goed!</button><button className="grade hard" disabled={busy} onClick={() => grade('hard')}>Twijfel...</button><button className="grade again" disabled={busy} onClick={() => grade('again')}><X size={23} />Fout</button></div>}
    <div className="study-cheer" aria-live="polite"><Mascot /><p>{session.answers > 0 && session.answers % 5 === 0 ? motivations[Math.floor(session.answers / 5) % motivations.length] : 'Op jouw tempo, Linda.'}</p></div>
  </section>;
  return <section><div className="page-heading"><div><p className="eyebrow">Een moment voor jezelf</p><h1>Wat ga je vandaag leren?</h1><p className="muted">Kies je ritme, Linda.</p></div></div>
    {resumable.length > 0 && <div className="resume-list">{resumable.map(item => <div className="resume-banner" key={item.id}><div><h3>Je leermoment staat voor je klaar</h3><span>{item.answers} vragen beantwoord · {new Date(item.startedAt).toLocaleDateString('nl-NL')}</span></div><button className="button primary" onClick={() => setActiveId(item.id)}><Play size={18} />Hervatten</button><button className="icon-button" title="Sessie afsluiten" aria-label="Sessie afsluiten" onClick={() => finishSession(item.id)}><X size={18} /></button></div>)}</div>}
    <div className="mode-grid">{[
      { id: 'normal', title: 'Normaal leren', text: 'Nieuwe kennis en slimme herhaling', icon: BookOpen },
      { id: 'quick', title: 'Snelle ronde', text: 'Tien willekeurige vragen', icon: Zap },
      { id: 'difficult', title: 'Moeilijke vragen', text: 'Wat extra aandacht verdient', icon: Star },
      { id: 'exam', title: 'Examentraining', text: 'Eerst antwoorden, dan beoordelen', icon: GraduationCap },
      { id: 'focus', title: 'Focusmodus', text: 'Een rustig moment voor jouw studie', icon: Clock },
      { id: 'mix', title: 'Mixmodus', text: 'Verschillende vakken door elkaar', icon: Shuffle },
      { id: 'boss', title: 'Boss Battle', text: 'De hoofdstukquiz: tien vragen', icon: Trophy }
    ].map(item => <button key={item.id} className={`mode-card ${mode === item.id ? 'selected' : ''}`} aria-pressed={mode === item.id} onClick={() => setMode(item.id as Mode)}><item.icon size={25} /><h3>{item.title}</h3><p>{item.text}</p></button>)}</div>
    {mode === 'exam' && <fieldset className="chapter-choices"><legend>Hoofdstukken voor je examentraining</legend>{chapterOptions.map(([value, label]) => <label className="checkbox" key={value}><input type="checkbox" checked={chapters.includes(value)} onChange={event => setChapters(event.target.checked ? [...chapters, value] : chapters.filter(item => item !== value))} />{label}</label>)}</fieldset>}
    <div className="session-options">{!['exam', 'mix'].includes(mode) && <label>Hoofdstuk<select value={chapter} onChange={event => setChapter(event.target.value)}><option value="">{mode === 'boss' ? 'Kies een hoofdstuk' : 'Alle hoofdstukken'}</option>{chapterOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}{mode === 'focus' && <label>Focustimer<select value={timerMinutes} onChange={event => setTimerMinutes(Number(event.target.value))}><option value={0}>Geen timer</option>{[10, 15, 25].map(value => <option key={value} value={value}>{value} minuten</option>)}</select></label>}<button className="button primary" onClick={begin} disabled={busy}><Play size={18} />Begin met leren<ArrowRight size={18} /></button></div>{error && <p className="error" role="alert">{error}</p>}
  </section>;
}
export function SessionResult({ session, onClose }: { session: StudySession; onClose: () => void }) {
  const reviews = useLiveQuery(() => db.reviews.where('sessionId').equals(session.id).toArray(), [session.id], []);
  const cards = useLiveQuery(() => db.cards.toArray(), [], []);
  const first = new Map<string, typeof reviews[number]>();
  [...reviews].sort((left, right) => Number(left.id.split(':').pop()) - Number(right.id.split(':').pop())).forEach(review => { if (!first.has(review.cardId)) first.set(review.cardId, review); });
  const initial = [...first.values()]; const correct = initial.filter(review => review.grade === 'good').length;
  const topics = [...new Set(initial.map(review => review.topic))].map(topic => { const subset = initial.filter(review => review.topic === topic); return { topic, score: Math.round(subset.filter(review => review.grade === 'good').length / subset.length * 100) }; });
  return <section className="session-result"><Mascot large />{session.bonus > 0 && <div className="confetti" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>}<p className="eyebrow">Een stapje verder</p><h1>Goed gedaan, Linda!</h1><p>Je hebt tijd gemaakt voor jezelf. Dat telt.</p><div className="result-numbers"><div><strong>{reviews.length}</strong><span>vragen geoefend</span></div><div><strong>{initial.length ? Math.round(correct / initial.length * 100) : 0}%</strong><span>goed bij de eerste poging</span></div><div><strong>+{reviews.reduce((total, review) => total + review.xp, 0) + session.bonus}</strong><span>XP verdiend</span></div></div>
    {session.examAnswers && <div className="quiz-analysis"><h2>Jouw hoofdstuk in beeld</h2>{topics.map(item => <p key={item.topic}><strong>{item.topic}</strong><span>{item.score >= 80 ? 'Sterk onderwerp' : 'Nog wat extra aandacht'} · {item.score}%</span></p>)}<details><summary>Antwoorden terugkijken</summary>{session.examAnswers.map(answer => <article key={answer.cardId}><h3>{cards.find(card => card.id === answer.cardId)?.question || 'Verwijderde kaart'}</h3><p>Jouw antwoord: {answer.text}</p><p>Antwoord: {cards.find(card => card.id === answer.cardId)?.answer}</p></article>)}</details></div>}
    <button className="button primary" onClick={onClose}><ArrowLeft size={18} />Terug naar leren</button></section>;
}