import { useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { logout, setUsername, useUsername } from '../services/identity';
import { Avatar } from './Users';
import { Modal } from './Modals';
import { BrandMark, Icon } from './Icon';
import { ConnectionStatus } from './ConnectionStatus';
import type { RoomChrome } from './RoomChrome';

export function Layout() {
  const username = useUsername(); const location = useLocation();
  const [roomChrome, setRoomChrome] = useState<RoomChrome | null>(null);
  const outlet = useMemo(() => ({ setRoomChrome }), []);
  const [editing, setEditing] = useState(false); const [name, setName] = useState(''); const [error, setError] = useState('');
  const [leaving, setLeaving] = useState(false);
  const save = () => {
    if (!name.trim()) return;
    try { setUsername(name); setEditing(false); setError(''); } catch (error) { setError((error as Error).message); }
  };
  const signOut = () => { logout(); window.location.assign('/'); };
  return <div className={`app-shell ${roomChrome?.cinema ? 'app-shell--cinema' : ''}`}>
    <a href="#main-content" className="skip-link">Pular para o conteúdo</a>
    <header className="app-header">
      <button className="brand" aria-label="Assista Junto — início" onClick={() => {
        if (location.pathname.toLowerCase().startsWith('/sala/')) setLeaving(true); else window.location.assign('/');
      }}><BrandMark /><span>Assista<span className="brand-accent">Junto</span></span></button>
      {roomChrome && <div className="header-room"><ConnectionStatus status={roomChrome.connection} /><span className="header-room-separator" /><span className="header-room-name" title={roomChrome.name}>{roomChrome.name}</span></div>}
      <div className="header-actions">
        {roomChrome && <>
          <button className="button button--quiet invite-button" title="Copiar URL da sala" onClick={roomChrome.invite}><Icon name="link" /><span>Convidar</span></button>
          <button className="button button--primary header-cinema" aria-pressed={roomChrome.cinema} onClick={roomChrome.toggleCinema}><Icon name="cinema" /><span>{roomChrome.cinema ? 'Sair do cinema' : 'Modo cinema'}</span></button>
          <button className="icon-button" title="Configurações da sessão" aria-label="Configurações da sessão" onClick={roomChrome.settings}><Icon name="settings" /></button>
        </>}
        {username && <button className="profile-button" title="Clique para alterar o nome" onClick={() => { setName(username); setError(''); setEditing(true); }}><Avatar name={username} size={34} /><span className="profile-name">{username}</span><Icon name="edit" /></button>}
        {!roomChrome && !username && <span className="header-caption">Boas histórias são melhores juntos.</span>}
      </div>
    </header>
    {editing && <Modal title="Seu perfil" onClose={() => setEditing(false)}>
      <form className="dialog-card" onSubmit={event => { event.preventDefault(); save(); }}>
        <div className="dialog-heading"><div className="dialog-symbol"><Icon name="people" /></div><button type="button" className="icon-button" aria-label="Fechar" onClick={() => setEditing(false)}><Icon name="close" /></button></div>
        <p className="eyebrow">SEU LUGAR NA SESSÃO</p><h2>Como vamos te chamar?</h2><p className="dialog-description">Seu apelido identifica você nas salas e no chat.</p>
        <label className="field-label" htmlFor="edit-name">Seu nome</label><input id="edit-name" className="text-input" aria-label="Editar nome" maxLength={50} value={name} onChange={event => setName(event.target.value)} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog-actions"><button type="button" className="button button--quiet" onClick={() => setEditing(false)}>Cancelar</button><button className="button button--primary" disabled={!name.trim()}>Salvar nome</button></div>
        <button type="button" className="button button--danger profile-logout" onClick={signOut}><Icon name="logout" />Sair</button>
      </form>
    </Modal>}
    {leaving && <Modal title="Sair da sala" onClose={() => setLeaving(false)}>
      <div className="dialog-card"><div className="dialog-heading"><div className="dialog-symbol"><Icon name="logout" /></div><button className="icon-button" aria-label="Fechar" onClick={() => setLeaving(false)}><Icon name="close" /></button></div>
        <h2>Sair da sala</h2><p className="dialog-description">Deseja sair da sala atual e voltar para a tela inicial?</p>
        <div className="dialog-actions"><button className="button button--quiet" onClick={() => { setLeaving(false); window.location.assign('/'); }}>Sim</button><button className="button button--primary" onClick={() => setLeaving(false)}>Não</button></div>
      </div>
    </Modal>}
    <main id="main-content" className="app-content"><Outlet context={outlet} /></main>
  </div>;
}
