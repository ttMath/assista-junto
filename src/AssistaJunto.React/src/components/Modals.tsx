import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { CreateRoom } from '../types/contracts';
import { Icon } from './Icon';

export function Modal({ children, title, small = false, onClose }: {
  children: ReactNode; title: string; small?: boolean; onClose?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const element = ref.current;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (element?.querySelector<HTMLElement>('input') ?? element?.querySelector<HTMLElement>('button'))?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && close.current) { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab' || !element) return;
      const focusable = [...element.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]')];
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    element?.addEventListener('keydown', trap);
    return () => { document.body.style.overflow = oldOverflow; element?.removeEventListener('keydown', trap); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  return <div className={`dialog-overlay ${small ? 'dialog-overlay--small' : ''}`} ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>{children}</div>;
}
export function CreateRoomModal({ onClose, onConfirm, busy }: {
  onClose: () => void; onConfirm: (model: CreateRoom) => void; busy: boolean;
}) {
  const [name, setName] = useState(''); const [password, setPassword] = useState('');
  const policyId = useId();
  return <Modal title="Nova Sala" onClose={busy ? undefined : onClose}>
    <form className="dialog-card create-room-modal" onSubmit={event => { event.preventDefault(); if (name.trim() && !busy) onConfirm({ name, password: password || null }); }}>
      <div className="dialog-heading"><div className="dialog-symbol"><Icon name="film" /></div><button type="button" className="icon-button" onClick={onClose} aria-label="Fechar" disabled={busy}><Icon name="close" /></button></div>
      <p className="eyebrow">PREPARE A PIPOCA</p><h2>Nova Sala</h2><p className="dialog-description">Uma sessão com a sua cara. Escolha um nome e convide sua companhia favorita.</p>
      <label className="field-label" htmlFor="room-name">Nome da Sala</label>
      <input id="room-name" className="text-input" value={name} onChange={event => setName(event.target.value)} placeholder="Ex: Noite de Cinema" disabled={busy} />
      <label className="field-label" htmlFor="room-password">Senha (Opcional)<Icon name="lock" /></label>
      <input id="room-password" type="password" className="text-input" value={password} onChange={event => setPassword(event.target.value)} placeholder="Deixe em branco para uma sala aberta" disabled={busy} />
      <div className="room-policy" id={policyId}><Icon name="info" /><span>Até 3 salas por usuário. Salas vazias são removidas após 3 minutos de inatividade.</span></div>
      <div className="dialog-actions"><button type="button" className="button button--quiet" onClick={onClose} disabled={busy}>Cancelar</button><button className="button button--primary" disabled={!name.trim() || busy} aria-describedby={policyId}>{busy ? <><span className="spinner" />CRIANDO...</> : 'CRIAR SALA'}</button></div>
    </form>
  </Modal>;
}
export function NamePrompt({ onConfirm }: { onConfirm: (name: string) => void }) {
  const [name, setName] = useState('');
  return <Modal title="Qual é o seu nome?" small>
    <form className="dialog-card" onSubmit={event => { event.preventDefault(); if (name.trim()) onConfirm(name.trim()); }}>
      <div className="dialog-symbol"><Icon name="people" /></div><p className="eyebrow">TEM LUGAR PARA VOCÊ</p><h2>Qual é o seu nome?</h2><p className="dialog-description">Digite seu nome para entrar na sala.</p>
      <label className="field-label" htmlFor="guest-name">Seu nome</label><input id="guest-name" className="text-input" placeholder="Seu nome..." aria-label="Seu nome" maxLength={50} value={name} onChange={event => setName(event.target.value)} />
      <button className="button button--primary button--full" disabled={!name.trim()}>ENTRAR</button>
    </form>
  </Modal>;
}
export function PasswordModal({ onClose, onConfirm, invalid, busy }: {
  onClose: () => void; onConfirm: (password: string) => void; invalid: boolean; busy: boolean;
}) {
  const [password, setPassword] = useState('');
  return <Modal title="Sala Privada" small onClose={busy ? undefined : onClose}>
    <form className="dialog-card" onSubmit={event => { event.preventDefault(); if (!busy) onConfirm(password); }}>
      <div className="dialog-heading"><div className="dialog-symbol"><Icon name="lock" /></div><button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}><Icon name="close" /></button></div>
      <p className="eyebrow">SÓ PARA CONVIDADOS</p><h2>Sala Privada</h2><p className="dialog-description">Esta sessão tem uma senha. Digite abaixo para assistir junto.</p>
      <label className="field-label" htmlFor="join-password">Senha da sala</label><input id="join-password" type="password" className="text-input" value={password} onChange={event => setPassword(event.target.value)} placeholder="Palavra-passe" aria-label="Palavra-passe" aria-invalid={invalid} aria-describedby={invalid ? 'password-error' : undefined} disabled={busy} />
      {invalid && <p id="password-error" className="form-error" role="alert">Senha incorreta.</p>}
      <button className="button button--primary button--full" disabled={busy}>{busy ? <><span className="spinner" />ACESSANDO...</> : 'ACESSAR'}</button>
      <button type="button" className="button button--quiet button--full" onClick={onClose}>Cancelar</button>
    </form>
  </Modal>;
}
