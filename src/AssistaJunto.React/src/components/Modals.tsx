import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { CreateRoom } from '../types/contracts';

export function Modal({ children, title, scope, small = false, onClose }: {
  children: ReactNode; title: string; scope: string; small?: boolean; onClose?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    const element = ref.current;
    (element?.querySelector<HTMLElement>('input') ?? element?.querySelector<HTMLElement>('button'))?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab' || !element) return;
      const focusable = [...element.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled), [tabindex="0"]')];
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    element?.addEventListener('keydown', trap);
    return () => { element?.removeEventListener('keydown', trap); if (previous instanceof HTMLElement) previous.focus(); };
  }, [onClose]);
  return <div className={`legacy-${scope}`}><div ref={ref} className="modal show d-block modal-overlay" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
    <div className={`modal-dialog ${small ? 'modal-sm' : ''} modal-dialog-centered`}>{children}</div>
  </div></div>;
}
export function CreateRoomModal({ onClose, onConfirm, busy }: {
  onClose: () => void; onConfirm: (model: CreateRoom) => void; busy: boolean;
}) {
  const [name, setName] = useState(''); const [password, setPassword] = useState('');
  return <Modal title="Nova Sala" scope="create" onClose={onClose}>
    <form className="modal-content create-room-modal p-2 rounded-4 shadow-lg" onSubmit={event => { event.preventDefault(); if (name.trim() && !busy) onConfirm({ name, password: password || null }); }}>
      <div className="modal-header border-0 pb-0"><div className="d-flex align-items-center gap-2">
        <h4 className="modal-title fw-bold text-white mb-0">Nova Sala</h4>
        <span className="room-policy-info" tabIndex={0} aria-label="Informações sobre limite de salas"><span className="room-policy-icon">i</span>
          <span className="room-policy-tooltip">Limite de 3 salas por usuário. Salas são removidas automaticamente após 3 minutos de inatividade.</span></span>
      </div><button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Fechar" disabled={busy} /></div>
      <div className="modal-body p-4"><div className="mb-4">
        <label className="form-label small text-white fw-bold text-uppercase" htmlFor="room-name">Nome da Sala</label>
        <input id="room-name" className="form-control modal-input text-white py-2" value={name} onChange={event => setName(event.target.value)} placeholder="Ex: Noite de Cinema" disabled={busy} />
      </div><div className="mb-3"><label className="form-label small text-white fw-bold text-uppercase" htmlFor="room-password">Senha (Opcional)</label>
        <input id="room-password" type="password" className="form-control modal-input text-white py-2" value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••" disabled={busy} />
      </div></div><div className="modal-footer border-0 pt-0 gap-3">
        <button type="button" className="btn text-white fw-bold text-decoration-none" onClick={onClose} disabled={busy}>Cancelar</button>
        <button className="btn btn-primary px-4 fw-bold shadow-sm col" disabled={!name.trim() || busy}>{busy ? 'CRIANDO...' : 'CRIAR SALA'}</button>
      </div>
    </form>
  </Modal>;
}
export function NamePrompt({ onConfirm }: { onConfirm: (name: string) => void }) {
  const [name, setName] = useState('');
  return <Modal title="Qual é o seu nome?" scope="name" small>
    <form className="modal-content bg-black border border-primary p-4 rounded-4 shadow-lg text-center" onSubmit={event => { event.preventDefault(); if (name.trim()) onConfirm(name.trim()); }}>
      <div className="h1 text-primary mb-3">👤</div><h5 className="text-white fw-bold mb-2">Qual é o seu nome?</h5>
      <p className="text-muted small mb-4">Digite seu nome para entrar na sala.</p>
      <input className="form-control bg-dark border-secondary text-white text-center mb-3 py-2" placeholder="Seu nome..." aria-label="Seu nome" maxLength={50} value={name} onChange={event => setName(event.target.value)} />
      <div className="d-grid gap-2"><button className="btn btn-primary py-3 fw-bold text-uppercase" disabled={!name.trim()}>ENTRAR</button></div>
    </form>
  </Modal>;
}
export function PasswordModal({ onClose, onConfirm, invalid, busy }: {
  onClose: () => void; onConfirm: (password: string) => void; invalid: boolean; busy: boolean;
}) {
  const [password, setPassword] = useState('');
  const submit = (event: FormEvent) => { event.preventDefault(); if (!busy) onConfirm(password); };
  return <Modal title="Sala Privada" scope="password" small onClose={onClose}>
    <form className="modal-content password-modal p-4 rounded-4 shadow-lg text-center" onSubmit={submit}>
      <div className="h1 text-warning mb-3">🔒</div><h5 className="text-white fw-bold mb-4">Sala Privada</h5>
      <input type="password" className="form-control password-input text-white text-center mb-3 py-2" value={password} onChange={event => setPassword(event.target.value)} placeholder="Palavra-passe" aria-label="Palavra-passe" disabled={busy} />
      {invalid && <div className="text-danger small mb-3 animate-shake" role="alert">Senha incorreta.</div>}
      <div className="d-grid gap-2"><button className="btn btn-primary password-confirm-btn py-3 fw-bold text-uppercase" disabled={busy}>{busy ? 'ACESSANDO...' : 'ACESSAR'}</button>
        <button type="button" className="btn btn-link fw-bold text-white btn-sm text-decoration-none" onClick={onClose}>Cancelar</button></div>
    </form>
  </Modal>;
}
