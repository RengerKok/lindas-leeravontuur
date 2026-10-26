import { lazy, Suspense, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, ChartNoAxesCombined, ChevronRight, CloudOff, House, Layers, Plus, Settings as SettingsIcon, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { db, defaults } from './db';
import Dashboard from './components/Dashboard';
import Library, { CardForm } from './components/Library';
import ImportPage from './components/ImportPage';
import Learn from './components/Learn';
import Progress from './components/Progress';
import Settings from './components/Settings';
import { useCloud } from './useCloud';
import { ToastContext } from './ui';
const PdfImport = lazy(() => import('./components/PdfImport'));

export default function App() {
  const cloud = useCloud();
  const [view, setView] = useState('home'); const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState(''); const [online, setOnline] = useState(navigator.onLine);
  const cards = useLiveQuery(() => db.cards.toArray(), [], []).filter(card => !card.deleted);
  const reviews = useLiveQuery(() => db.reviews.toArray(), [], []);
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], []);
  const settings = useLiveQuery(() => db.settings.get('preferences'), [], defaults) || defaults;
  const { needRefresh: [needRefresh, setNeedRefresh], offlineReady: [offlineReady], updateServiceWorker } = useRegisterSW({ onRegisterError: () => setMessage('Offline installatie is niet gelukt. Probeer het opnieuw met internet.') });
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
  useEffect(() => { document.documentElement.dataset.theme = settings.theme; document.documentElement.dataset.large = String(settings.largeText); document.documentElement.dataset.motion = String(settings.animations); }, [settings]);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(''), 6500); return () => clearTimeout(timer); }, [message]);
  function navigate(next: string) { if (next === 'add') setAdding(true); else { setView(next); window.scrollTo({ top: 0 }); } }
  const navigation = [{ id: 'home', label: 'Mijn start', icon: House }, { id: 'library', label: 'Flashcards', icon: Layers }, { id: 'learn', label: 'Leren', icon: BookOpen }, { id: 'import', label: 'Toevoegen', icon: Plus }, { id: 'progress', label: 'Voortgang', icon: ChartNoAxesCombined }];
  return <ToastContext.Provider value={setMessage}>
    <a href="#main" className="skip-link">Naar de inhoud</a>
    <div className="app-layout"><aside className="sidebar"><button className="brand" onClick={() => navigate('home')}><span className="brand-icon"><BookOpen size={24} /></span><span>Linda's<span>Leeravontuur</span></span></button>
      <span className="sidebar-label">JOUW LEERPLEK</span><nav aria-label="Hoofdnavigatie">{navigation.map(item => <button key={item.id} className={`nav-item ${view === item.id || view === 'difficult' && item.id === 'learn' ? 'active' : ''}`} aria-current={view === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><item.icon size={20} /><span>{item.label}</span>{view === item.id && <ChevronRight className="nav-chevron" size={16} />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="local-status"><span className={`status-dot ${online ? '' : 'offline'}`} />{online ? 'Lokaal opgeslagen' : 'Je leert offline'}<span>{offlineReady ? 'Offline beschikbaar' : 'Jouw gegevens, op dit apparaat'}</span></div><button className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => navigate('settings')}><SettingsIcon size={20} /><span>Instellingen</span></button><div className="profile"><span className="avatar">L</span><div><strong>Linda</strong><span>Een leven lang nieuwsgierig</span></div></div></div>
    </aside><div className="main-wrap"><header className="topbar"><span>Een frisse blik. Een nieuwe stap.</span><div className="row"><button className="text-button connection" onClick={() => navigate('settings')} title={cloud.status}><CloudOff size={16} />{!online ? 'Offline' : cloud.user ? cloud.busy ? 'Bezig...' : cloud.error ? 'Syncfout' : cloud.conflicts.length ? 'Conflict' : 'Cloud' : 'Lokaal'}</button><button className="icon-button mobile-settings" aria-label="Instellingen" title="Instellingen" onClick={() => navigate('settings')}><SettingsIcon size={19} /></button><span className="avatar small-avatar">L</span></div></header>
      <main id="main" className="main-content" tabIndex={-1}>
        {view === 'home' && <Dashboard cards={cards} reviews={reviews} sessions={sessions} navigate={navigate} />}
        {view === 'library' && <Library />}
        {view === 'import' && <ImportPage onPdf={() => navigate('pdf')} />}
        {(view === 'learn' || view === 'difficult') && <Learn key={view} initialMode={view === 'difficult' ? 'difficult' : 'normal'} />}
        {view === 'progress' && <Progress cards={cards} reviews={reviews} sessions={sessions} />}
        {view === 'pdf' && <Suspense fallback={<p role="status">PDF-lezer openen...</p>}><PdfImport onBack={() => navigate('import')} /></Suspense>}
        {view === 'settings' && <Settings cloud={cloud} />}
      </main><footer className="app-footer">Gemaakt voor jouw tempo.<span>Linda's Leeravontuur</span></footer>
    </div></div>
    {adding && <CardForm onClose={() => setAdding(false)} />}
    {message && <div className="toast" role="status"><span>{message}</span><button className="icon-button" aria-label="Melding sluiten" onClick={() => setMessage('')}><X size={18} /></button></div>}
    {needRefresh && <div className="update-banner" role="status"><span>Er is een nieuwe versie. Rond je huidige handeling eerst af.</span><button className="button primary small" onClick={() => updateServiceWorker(true)}>Bijwerken</button><button className="text-button" onClick={() => setNeedRefresh(false)}>Later</button></div>}
  </ToastContext.Provider>;
}