import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Api } from '../services/api';
import { setUsername, useUsername } from '../services/identity';
import { CreateRoomModal } from '../components/Modals';
import { Metadata } from '../components/Metadata';
import type { CreateRoom } from '../types/contracts';

export function Home({ api }: { api: Api }) {
  const username = useUsername(); const navigate = useNavigate();
  const [name, setName] = useState(''); const [nameError, setNameError] = useState('');
  const [showCreate, setShowCreate] = useState(!!username); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const close = useCallback(() => { if (!pending.current) setShowCreate(false); }, []);
  const submitName = () => {
    if (!name.trim()) return;
    try { setUsername(name); setNameError(''); setError(''); setShowCreate(true); }
    catch (error) { setNameError((error as Error).message); }
  };
  const create = async (model: CreateRoom) => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { const room = await api.createRoom(model); navigate(`/sala/${room.hash}`); }
    catch (error) { setShowCreate(false); setError(error instanceof Error ? error.message : 'O servidor rejeitou os dados. Tente outro nome.'); }
    finally { pending.current = false; setBusy(false); }
  };
  return <div className="legacy-home"><Metadata />{!username ? <div className="bg-hero d-flex align-items-center justify-content-center">
    <div className="bg-blob blob-1" /><div className="bg-blob blob-2" />
    <div className="container text-center px-4"><div className="hero-content-box mx-auto" style={{ maxWidth: 800 }}>
      <h1 className="text-glow fw-black mb-2">Assista Junto</h1><p className="text-white mb-5 h5 fw-light mx-auto mt-3" style={{ maxWidth: 450 }}>Assista vídeos em sincronia perfeita com sua comunidade.</p>
      <div className="d-flex justify-content-center"><div className="d-flex flex-column align-items-center gap-3" style={{ minWidth: 320 }}>
        <input className="form-control form-control-lg text-center name-entry-input" placeholder="Digite seu nome..." aria-label="Digite seu nome" maxLength={50} value={name} onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); submitName(); } }} />
        {nameError && <small className="name-validation-message" role="alert">{nameError}</small>}
        <button className="btn btn-lg btn-primary px-5 fw-bold name-entry-button" onClick={submitName} disabled={!name.trim()}>ENTRAR</button>
      </div></div>
    </div><div className="mt-5 credits-wrap"><small className="credits-line">Feito com 💜 por <a href="https://github.com/ttMath" target="_blank" rel="noopener noreferrer">Math</a> &amp; <a href="https://github.com/MWillian" target="_blank" rel="noopener noreferrer">MWillian</a></small>
      <a className="project-link" href="https://github.com/ttMath/assista-junto" target="_blank" rel="noopener noreferrer" aria-label="Projeto no GitHub"><svg className="github-logo" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.01.08-2.11 0 0 .67-.21 2.2.82a7.64 7.64 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.91.08 2.11.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" /></svg></a>
    </div></div>
  </div> : <>
    <section className="lobby-shell d-flex align-items-center"><div className="container py-4 py-lg-5 text-center"><div className="lobby-hero mx-auto" style={{ maxWidth: 620 }}><div className="w-100">
      <p className="lobby-eyebrow mb-2">ASSISTA JUNTO</p><h1 className="fw-black text-white mb-2">Crie sua sala</h1>
      <p className="text-muted mb-4">Após escolher seu apelido, você cria uma nova sala e entra direto nela.</p>
      <button className="btn btn-primary btn-create-room" onClick={() => { setError(''); setShowCreate(true); }}>+ Nova Sala</button>
    </div></div></div></section>
    {showCreate && <CreateRoomModal onClose={close} onConfirm={model => { void create(model); }} busy={busy} />}
    {error && <div className="create-room-toast fixed-bottom p-4 d-flex justify-content-center"><div className="alert alert-danger shadow" role="alert">{error}</div></div>}
  </>}</div>;
}
