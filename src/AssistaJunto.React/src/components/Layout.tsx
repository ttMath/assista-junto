import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { logout, setUsername, useUsername } from '../services/identity';
import { Avatar } from './Users';
import { Modal } from './Modals';

export function Layout() {
  const username = useUsername(); const location = useLocation();
  const [editing, setEditing] = useState(false); const [name, setName] = useState(''); const [error, setError] = useState('');
  const [leaving, setLeaving] = useState(false);
  const save = () => {
    if (!name.trim()) return;
    try { setUsername(name); setEditing(false); setError(''); } catch (error) { setError((error as Error).message); }
  };
  return <div className="legacy-layout"><div className="page">
    <header className="top-bar d-flex align-items-center justify-content-between px-3 px-md-4 py-2 text-white">
      <div className="d-flex align-items-center gap-3"><button className="text-decoration-none text-white fw-bold fs-5 fs-md-4 home-btn" onClick={() => {
        if (location.pathname.toLowerCase().startsWith('/sala/')) setLeaving(true); else window.location.assign('/');
      }}>🎬 Assista Junto</button></div>
      <div className="d-flex align-items-center gap-3">{username && <>
        {editing ? <div className="d-flex align-items-center gap-2">
          <input className="form-control form-control-sm edit-name-input" aria-label="Editar nome" maxLength={50} value={name} onChange={event => setName(event.target.value)} onKeyDown={event => {
            if (event.key === 'Enter') save(); else if (event.key === 'Escape') { setEditing(false); setError(''); }
          }} />
          <button className="btn btn-sm btn-success px-2 py-0" title="Salvar" onClick={save} disabled={!name.trim()}>✓</button>
          <button className="btn btn-sm btn-outline-secondary px-2 py-0" title="Cancelar" onClick={() => { setEditing(false); setError(''); }}>✕</button>
        </div> : <button className="btn btn-sm user-name-btn d-flex align-items-center gap-2" title="Clique para alterar o nome" onClick={() => { setName(username); setError(''); setEditing(true); }}>
          <Avatar name={username} size={26} /><span className="fw-semibold">{username}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
        </button>}
        <button className="btn btn-outline-light btn-sm btn-logout" onClick={() => { logout(); window.location.assign('/'); }}>Sair</button>
      </>}</div>
    </header>
    {error && <div className="name-edit-alert" role="alert">{error}</div>}
    {leaving && <Modal title="Sair da sala" scope="leave" onClose={() => setLeaving(false)}>
      <div className="modal-content leave-room-modal p-2 rounded-4 shadow-lg"><div className="modal-header border-0 pb-0">
        <h4 className="modal-title fw-bold text-white">Sair da sala</h4><button className="btn-close btn-close-white" aria-label="Fechar" onClick={() => setLeaving(false)} />
      </div><div className="modal-body p-4"><p className="text-white mb-0">Deseja sair da sala atual e voltar para a tela inicial?</p></div>
        <div className="modal-footer border-0 pt-0 gap-3"><button className="btn text-white fw-bold text-decoration-none" onClick={() => { setLeaving(false); window.location.assign('/'); }}>Sim</button>
          <button className="btn btn-primary px-4 fw-bold shadow-sm col" onClick={() => setLeaving(false)}>Não</button></div></div>
    </Modal>}
    <main className="content-area"><Outlet /></main>
  </div></div>;
}
