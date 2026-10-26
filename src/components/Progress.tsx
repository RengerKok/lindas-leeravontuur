import { useState } from 'react';
import { Award, CheckCircle2, Clock, Flame, RotateCcw, Target } from 'lucide-react';
import { badges, dayKey, mastery, statistics } from '../stats';
import { Meter } from '../ui';
import type { Flashcard, Review, StudySession } from '../types';
import '../progress.css';
export default function Progress({ cards, reviews, sessions }: { cards: Flashcard[]; reviews: Review[]; sessions: StudySession[] }) {
  const [range, setRange] = useState(7); const stats = statistics(cards, reviews, sessions);
  const days = Array.from({ length: range }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - range + index + 1); const day = dayKey(date); const subset = reviews.filter(review => review.day === day); return { day, date, count: subset.length, seconds: subset.reduce((total, review) => total + review.seconds, 0) }; });
  const rangeReviews = reviews.filter(review => review.day >= days[0].day); const maximum = Math.max(1, ...days.map(day => day.count));
  const chapters = [...new Set(cards.map(card => `${card.study}\u001f${card.subject}\u001f${card.chapter}`))].map(key => {
    const [study, subject, chapter] = key.split('\u001f'); const subset = cards.filter(card => card.study === study && card.subject === subject && card.chapter === chapter);
    return { key, study, subject, chapter, count: subset.length, mastery: Math.round(subset.reduce((total, card) => total + mastery(card), 0) / subset.length), practiced: subset.filter(card => card.scheduler.reps > 0).length };
  }).sort((left, right) => left.mastery - right.mastery);
  return <section><div className="page-heading"><div><p className="eyebrow">Elke stap zichtbaar</p><h1>Mijn voortgang</h1><p className="muted">Kijk eens hoe ver je komt, Linda.</p></div><div className="segmented" role="group" aria-label="Statistiekperiode">{[7, 30].map(value => <button key={value} className={range === value ? 'active' : ''} aria-pressed={range === value} onClick={() => setRange(value)}>{value} dagen</button>)}</div></div>
    <div className="progress-stats">{[
      { icon: Target, value: new Set(rangeReviews.map(review => review.cardId)).size, text: 'verschillende kaarten geoefend' },
      { icon: CheckCircle2, value: `${rangeReviews.length ? Math.round(rangeReviews.filter(review => review.grade === 'good').length / rangeReviews.length * 100) : 0}%`, text: 'goede antwoorden' },
      { icon: RotateCcw, value: stats.due, text: 'nu te herhalen' },
      { icon: Clock, value: `${Math.round(rangeReviews.reduce((total, review) => total + review.seconds, 0) / 60)} min`, text: 'actieve oefentijd' }
    ].map(item => <div key={item.text}><item.icon size={21} /><strong>{item.value}</strong><span>{item.text}</span></div>)}</div>
    <section className="chart-section"><div className="section-heading"><h2>Jouw leerritme</h2><span className="muted small-text">{days.filter(day => day.count).length} studiedagen in {range} dagen</span></div><div className={`activity-chart ${range === 30 ? 'month' : ''}`} role="img" aria-label={`Oefenactiviteit: ${rangeReviews.length} antwoorden in ${range} dagen`}>{days.map(day => <div key={day.day} className="chart-column"><span>{day.count || ''}</span><div title={`${day.day}: ${day.count} antwoorden, ${Math.round(day.seconds / 60)} minuten`} style={{ height: `${Math.max(day.count ? 4 : 0, day.count / maximum * 130)}px` }} /><small>{range === 7 ? day.date.toLocaleDateString('nl-NL', { weekday: 'short' }) : day.date.getDate()}</small></div>)}</div>
      <details><summary>Dagcijfers bekijken</summary><div className="table-scroll"><table><thead><tr><th>Dag</th><th>Antwoorden</th><th>Oefentijd</th></tr></thead><tbody>{days.map(day => <tr key={day.day}><td>{day.date.toLocaleDateString('nl-NL')}</td><td>{day.count}</td><td>{Math.round(day.seconds / 60)} minuten</td></tr>)}</tbody></table></div></details>
    </section>
    <div className="progress-summary"><span><Flame size={20} />{stats.streak} dagen op een rij</span><span><Award size={20} />{stats.xp} XP · Level {stats.level}</span></div>
    <section className="chapter-progress"><div className="section-heading"><h2>Beheersing per hoofdstuk</h2><span className="muted small-text">Van extra aandacht naar vertrouwd</span></div>{chapters.length ? chapters.map(item => <div className="chapter-row" key={item.key}><div><h3>{item.chapter}</h3><p>{item.study} · {item.subject}</p></div><div><div className="row between"><span>{item.practiced} / {item.count} kaarten geoefend</span><strong>{item.mastery}%</strong></div><Meter value={item.mastery} label={`Geschatte beheersing ${item.chapter}`} /></div></div>) : <p className="muted">Hier groeit straks het overzicht van je hoofdstukken.</p>}</section>
    <section className="badge-section"><h2>Jouw mijlpalen</h2><div className="badge-grid">{badges(reviews, sessions).map(badge => <article key={badge.title} className={`badge ${badge.earned ? 'earned' : ''}`}><span><Award size={28} /></span><h3>{badge.title}</h3><p>{badge.description}</p><small>{badge.earned ? 'Verdiend' : 'Nog te ontdekken'}</small></article>)}</div></section>
  </section>;
}