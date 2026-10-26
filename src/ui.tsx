import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export const ToastContext = createContext<(message: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); const dialog = ref.current; return () => dialog?.close(); }, []);
  return <dialog ref={ref} className="modal" onCancel={onClose} aria-label={title}>
    <header className="row between"><h2>{title}</h2><button className="icon-button" title="Sluiten" aria-label="Sluiten" onClick={onClose}><X /></button></header>
    {children}
  </dialog>;
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><Mascot /><h2>{title}</h2>{children}</div>;
}
export function Mascot({ large = false }: { large?: boolean }) {
  return <svg className={`mascot ${large ? 'large' : ''}`} viewBox="0 0 180 160" role="img" aria-label="Blad, Linda's vriendelijke boekenmaatje">
    <ellipse cx="90" cy="143" rx="59" ry="8" fill="#244e4020" />
    <path d="M38 31 Q58 22 88 36 L88 124 Q62 108 36 119 Z" fill="#fffdf5" stroke="#356859" strokeWidth="4" />
    <path d="M88 36 Q119 22 144 32 L146 119 Q117 109 88 124 Z" fill="#d3e9dd" stroke="#356859" strokeWidth="4" />
    <path d="M88 36 V124 M50 46 L70 48 M108 45 L131 43" fill="none" stroke="#82ab97" strokeWidth="3" strokeLinecap="round" />
    <circle cx="70" cy="72" r="4" fill="#29463e" /><circle cx="111" cy="72" r="4" fill="#29463e" />
    <path d="M81 86 Q90 95 100 84" fill="none" stroke="#29463e" strokeWidth="3" strokeLinecap="round" />
    <ellipse cx="59" cy="84" rx="8" ry="4" fill="#efb2a8" /><ellipse cx="124" cy="84" rx="8" ry="4" fill="#efb2a8" />
    <path d="M33 92 Q13 86 20 68 M146 92 Q163 88 162 72" fill="none" stroke="#356859" strokeWidth="4" strokeLinecap="round" />
    <path d="M91 27 Q85 11 101 8 Q109 21 91 27" fill="#82ab97" />
  </svg>;
}
export function Meter({ value, label }: { value: number; label: string }) {
  return <div className="meter" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}
export const dateLabel = (date: string | Date) => new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' }).format(new Date(date));