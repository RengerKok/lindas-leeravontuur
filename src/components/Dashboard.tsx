import { ArrowRight, BookOpen, Flame, Layers, Music2, Plus, RotateCcw, Sparkles, Target, Ticket, Trophy } from 'lucide-react';
import { useState } from 'react';
import { addDemoCards } from '../cards';
import { dailyMotivation, mastery, statistics } from '../stats';
import type { Flashcard, Review, StudySession } from '../types';
import { Meter, useToast } from '../ui';
export default function Dashboard({ cards, reviews, sessions, navigate }: { cards: Flashcard[]; reviews: Review[]; sessions: StudySession[]; navigate: (view: string) => void }) {
  const stats = statistics(cards, reviews, sessions); const toast = useToast();
  const [addingDemo, setAddingDemo] = useState(false);
  async function addSwiftieSet() {
    setAddingDemo(true);
    try { const count = await addDemoCards(); toast(count ? `${count} Swiftie-vragen toegevoegd.` : 'Alle twintig Swiftie-vragen staan al in je collectie.'); }
    catch { toast('Toevoegen is niet gelukt. Controleer de opslagruimte.'); }
    finally { setAddingDemo(false); }
  }
  const subjects = [...new Set(cards.map(card => card.subject))];
  return <>
    <div className="dashboard-title"><div><p className="eyebrow"><Music2 size={14} />Taylor Swift fan-editie</p><h1>Hoi Linda! <span>Klaar voor jouw volgende leer-era?</span></h1></div><span className="date-label">{new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span></div>
    <section className="welcome-band"><div><span className="label-pill"><Sparkles size={15} />Vandaag sta jij op de setlist</span><h2>Jouw tempo.<br />Jouw leer-era.</h2><p>{dailyMotivation()}</p><button className="button primary" onClick={() => navigate('learn')}><BookOpen size={20} />Begin met leren<ArrowRight size={18} /></button><button className="text-button" onClick={() => navigate('difficult')}><RotateCcw size={16} />Herhaal moeilijke vragen</button></div><div className="welcome-art" aria-label="Linda's Study Tour"><span className="ticket-heading"><Ticket size={16} />LINDA'S STUDY TOUR</span><img className="swiftie-mascot" src={`${import.meta.env.BASE_URL}icons/icon-512.png`} width="512" height="512" alt="Vrolijk boek voor Linda" /><div className="friendship-bracelet" aria-label="Armbandje met Linda"><i /><i />{'LINDA'.split('').map((letter, index) => <span key={index}>{letter}</span>)}<i /><i /></div><span className="art-caption">Een toegift voor jezelf.</span></div></section>
    <section className="stats-strip" aria-label="Jouw leerstand">{[
      { icon: Layers, value: cards.length, label: 'flashcards', color: 'mint' },
      { icon: Target, value: stats.today, label: 'vandaag geoefend', color: 'lavender' },
      { icon: RotateCcw, value: stats.due, label: 'klaar voor herhaling', color: 'coral' },
      { icon: Flame, value: `${stats.streak} ${stats.streak === 1 ? 'dag' : 'dagen'}`, label: 'op een rij', color: 'gold' }
    ].map(item => <div className="stat" key={item.label}><span className={`stat-icon ${item.color}`}><item.icon size={22} /></span><div><strong>{item.value}</strong><span>{item.label}</span></div></div>)}</section>
    <div className="dashboard-grid"><section className="subjects-section"><div className="section-heading"><h2>Jouw studieonderwerpen</h2><button className="text-button" onClick={() => navigate('library')}>Mijn flashcards<ArrowRight size={16} /></button></div>
      {subjects.length ? subjects.map((subject, index) => { const subset = cards.filter(card => card.subject === subject); const progress = Math.round(subset.reduce((sum, card) => sum + mastery(card), 0) / subset.length); return <button key={subject} className="subject-item" onClick={() => navigate('learn')}><span className={`subject-icon ${index % 2 ? 'lavender' : 'mint'}`}><BookOpen size={23} /></span><div><h3>{subject}</h3><p>{subset.length} flashcards · {[...new Set(subset.map(card => card.chapter))].length} hoofdstukken</p><Meter value={progress} label={`Beheersing ${subject}`} /></div><strong>{progress}%</strong><ArrowRight size={18} /></button>; }) : <div className="onboarding"><Music2 size={28} /><h3>Wat wil je vandaag ontdekken?</h3><p>Je collectie is nog leeg, Linda.</p></div>}
      <button className="text-button swiftie-pack" disabled={addingDemo} onClick={addSwiftieSet}><Music2 size={18} />{addingDemo ? 'Vragen toevoegen...' : '20 Swiftie-vragen toevoegen'}<Plus size={16} /></button>
      <button className="add-subject" onClick={() => navigate('add')}><Plus size={20} />Vragen toevoegen</button>
    </section><aside className="growth-section"><div className="section-heading"><h2>Kijk jou groeien</h2><Trophy size={20} /></div><div className="level-line"><span className="level-medal">{stats.level}</span><div><h3>Level {stats.level} · {stats.level < 3 ? 'Nieuwsgierige ontdekker' : 'Kennisverzamelaar'}</h3><p>{stats.xp} XP verdiend</p></div></div><Meter value={stats.xp % 200 / 2} label="Naar het volgende level" /><p className="muted small-text">Nog {200 - stats.xp % 200} XP tot level {stats.level + 1}</p>
      <div className="daily-mission"><span className="eyebrow"><Target size={16} />Jouw dagmissie</span><h3>Tien vragen, tien stappen vooruit</h3><div className="row between"><span>{Math.min(stats.mission, 10)} / 10 verschillende vragen</span><span className="tag">+20 XP</span></div><Meter value={stats.mission * 10} label="Dagmissie" />{stats.mission >= 10 && <p>Missie behaald. Lekker bezig, Linda!</p>}</div><button className="text-button" onClick={() => navigate('progress')}>Mijn voortgang<ArrowRight size={16} /></button>
    </aside></div>
    <div className="encouragement"><Sparkles size={24} /><p>Een armbandje groeit kraal voor kraal.<br /><strong>Jouw kennis groeit vraag voor vraag.</strong></p><span>Voor jou geschreven, Linda</span></div>
  </>;
}