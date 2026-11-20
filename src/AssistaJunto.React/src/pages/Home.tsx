import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Api } from '../services/api';
import { setUsername, useUsername } from '../services/identity';
import { CreateRoomModal } from '../components/Modals';
import { Metadata } from '../components/Metadata';
import { WelcomeArt } from '../components/WelcomeArt';
import { Icon } from '../components/Icon';
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

  return <div className="home-page"><Metadata />
    {!username ? <section className="welcome-layout"><div className="welcome-content">
      <p className="eyebrow"><span className="eyebrow-line" />SEU CINEMA, EM BOA COMPANHIA</p>
      <h1>O melhor lugar é<br /><span>assistir junto.</span></h1>
      <p className="welcome-description">Compartilhe o play, a conversa e aquele momento que merece companhia. Seus vídeos do YouTube, em sincronia com quem você gosta.</p>
      <form className="name-entry" onSubmit={event => { event.preventDefault(); submitName(); }}>
        <label className="field-label" htmlFor="welcome-name">Primeiro, como podemos te chamar?</label>
        <div className="name-entry-row"><span className="name-input-wrap"><Icon name="people" /><input id="welcome-name" className="text-input" placeholder="Digite seu nome..." aria-label="Digite seu nome" maxLength={50} value={name} onChange={event => setName(event.target.value)} /></span><button className="button button--primary" disabled={!name.trim()}>ENTRAR</button></div>
        {nameError && <p className="form-error" role="alert">{nameError}</p>}<small>Um apelido e você já faz parte da sessão.</small>
      </form>
      <div className="welcome-features"><div><Icon name="play" /><span>Play sincronizado</span></div><div><Icon name="chat" /><span>Conversa em tempo real</span></div><div><Icon name="queue" /><span>Fila colaborativa</span></div></div>
    </div><WelcomeArt /></section> : <section className="lobby-section"><div className="lobby-card"><span className="dialog-symbol"><Icon name="film" /></span><p className="eyebrow">O PRÓXIMO PLAY É SEU</p><h1>Pronto para a sessão,<br /><span>{username}?</span></h1><p>Escolha um nome para sua sala, adicione seus vídeos e convide quem vai assistir com você.</p><button className="button button--primary" onClick={() => { setError(''); setShowCreate(true); }}><Icon name="plus" />Nova Sala</button><span className="lobby-footnote">O cinema é seu. A boa companhia também.</span></div></section>}
    {username && showCreate && <CreateRoomModal onClose={close} onConfirm={model => { void create(model); }} busy={busy} />}
    {error && <div className="home-error" role="alert"><Icon name="info" /><span>{error}</span></div>}
    <footer className="home-footer"><span>Boas histórias merecem companhia.</span><div>Feito com <span className="credit-heart">♥</span> por <a href="https://github.com/ttMath" target="_blank" rel="noopener noreferrer">Math</a> e <a href="https://github.com/MWillian" target="_blank" rel="noopener noreferrer">MWillian</a><span className="footer-separator">·</span><a href="https://github.com/ttMath/assista-junto" target="_blank" rel="noopener noreferrer">Projeto no GitHub</a></div></footer>
  </div>;
}
