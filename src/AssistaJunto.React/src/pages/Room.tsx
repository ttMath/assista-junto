import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Api, ApiError } from '../services/api';
import { getUsername, setUsername, useUsername } from '../services/identity';
import type { Room as RoomModel, RoomState } from '../types/contracts';
import { NamePrompt, PasswordModal } from '../components/Modals';
import { RoomSession } from '../features/room/RoomSession';
import { YouTubePlayer } from '../features/player/YouTubePlayer';
import { Metadata } from '../components/Metadata';
import { VideoControls } from '../components/VideoControls';
import { Playlist } from '../components/Playlist';
import { Chat } from '../components/Chat';
import { Users } from '../components/Users';
import { Toasts } from '../components/Toasts';

export function RoomPage({ api }: { api: Api }) {
  const { hash = '' } = useParams();
  return <RoomAccess key={hash} api={api} hash={hash} />;
}
function RoomAccess({ api, hash }: { api: Api; hash: string }) {
  const username = useUsername(); const navigate = useNavigate();
  const hasUsername = !!username;
  const [room, setRoom] = useState<RoomModel | null>(null); const [privateRoom, setPrivateRoom] = useState(false);
  const [initial, setInitial] = useState<RoomState>(); const [admitted, setAdmitted] = useState(false);
  const [error, setError] = useState(''); const [invalid, setInvalid] = useState(false); const [busy, setBusy] = useState(false);
  const joinLock = useRef(false); const generation = useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    const version = ++generation.current;
    setAdmitted(false); setRoom(null); setPrivateRoom(false); setInitial(undefined); setError(''); setInvalid(false);
    const joiningName = getUsername();
    if (hasUsername && joiningName) void api.getRoom(hash, controller.signal).then(room => {
      if (controller.signal.aborted) return;
      setRoom(room);
      const needsPassword = room.hasPassword && room.ownerDisplayName.toLowerCase() !== joiningName.toLowerCase();
      setPrivateRoom(needsPassword); setAdmitted(!needsPassword);
    }).catch(error => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 404) navigate('/', { replace: true });
      else setError(error instanceof Error ? error.message : 'Não foi possível entrar na sala.');
    });
    return () => { generation.current = version + 1; controller.abort(); };
  }, [api, hash, hasUsername, navigate]);
  const home = useCallback(() => navigate('/'), [navigate]);
  const password = async (password: string) => {
    if (joinLock.current) return;
    const version = generation.current;
    joinLock.current = true; setBusy(true); setError('');
    try {
      const state = await api.joinRoom(hash, password);
      if (version !== generation.current) return;
      setInitial(state); setPrivateRoom(false); setInvalid(false); setAdmitted(true);
    } catch (error) {
      if (version !== generation.current) return;
      if (error instanceof ApiError && error.status === 401) setInvalid(true);
      else setError(error instanceof Error ? error.message : 'Não foi possível entrar na sala.');
    } finally { joinLock.current = false; setBusy(false); }
  };
  return <div className="legacy-room"><Metadata room />
    {!username ? <NamePrompt onConfirm={name => { try { setUsername(name); } catch (error) { setError((error as Error).message); } }} />
      : privateRoom ? <PasswordModal onClose={home} onConfirm={value => { void password(value); }} invalid={invalid} busy={busy} />
      : admitted && room ? <ActiveRoom key={room.hash} api={api} room={room} initial={initial} />
      : !error ? <div className="d-flex flex-column justify-content-center align-items-center vh-100 bg-black"><div className="spinner-border text-primary mb-3" /><p className="text-muted text-uppercase fw-bold small">Sincronizando com a sala...</p></div> : null}
    {error && <div className="room-access-error alert alert-danger" role="alert">{error} <button className="btn btn-outline-light btn-sm" onClick={() => window.location.reload()}>Tentar novamente</button></div>}
  </div>;
}
function ActiveRoom({ api, room, initial }: { api: Api; room: RoomModel; initial?: RoomState }) {
  const [session, setSession] = useState<RoomSession>();
  useEffect(() => {
    const current = new RoomSession(api, room, initial);
    setSession(current); void current.start();
    return () => { void current.dispose().catch(console.error); };
  }, [api, room, initial]);
  return session ? <RoomView api={api} session={session} /> : null;
}
function Player({ session }: { session: RoomSession }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = document.createElement('div'); element.id = 'yt-player'; host.current?.append(element);
    const player = new YouTubePlayer(element, { ready: session.ready, state: session.onPlayerState, seek: session.onPlayerSeek, error: session.toast });
    session.attachPlayer(player);
    return () => { player.destroy(); element.remove(); };
  }, [session]);
  return <div className="player-stage mb-3"><div className="ratio ratio-16x9 rounded-4 overflow-hidden" ref={host} /></div>;
}
function RoomView({ api, session }: { api: Api; session: RoomSession }) {
  const state = useSyncExternalStore(session.subscribe, session.snapshot);
  const [tab, setTab] = useState<'chat' | 'users'>('chat');
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${location.origin}/sala/${session.room.hash}`); session.toast('URL da sala copiada.'); }
    catch { session.toast('Não foi possível copiar a URL da sala.'); }
  };
  return <><Toasts toasts={state.toasts} onDismiss={session.dismissToast} />
    <section className="room-shell"><div className="container-fluid py-3 py-lg-4">
      {state.connection !== 'connected' && <div className="alert alert-warning d-flex align-items-center justify-content-between" role="status">
        <span>{state.connection === 'disconnected' ? 'Conexão com a sala interrompida.' : state.connection === 'reconnecting' ? 'Reconectando com a sala...' : 'Conectando com a sala...'}</span>
        {state.connection === 'disconnected' && <button className="btn btn-sm btn-outline-dark" onClick={() => window.location.reload()}>Reconectar</button>}
      </div>}
      <div className="room-grid"><div className="room-main-column">
        <div className="room-main-header mb-3"><div><p className="room-overline mb-1">SALA ATIVA</p><h4 className="text-white fw-bold mb-0">{session.room.name}</h4></div>
          <div className="room-status-pill"><span className="dot" />{state.isPlaying ? 'Ao vivo' : 'Pausado'}</div></div>
        <Player session={session} /><VideoControls session={session} state={state} />
      </div><aside className="room-side-column">
        <Playlist api={api} session={session} state={state} />
        <div className="side-panel social-panel"><div className="social-tabs mb-3" role="tablist" aria-label="Sala">
          <button className={`social-tab-btn ${tab === 'chat' ? 'active' : ''}`} role="tab" aria-selected={tab === 'chat'} onClick={() => setTab('chat')}><i className="bi bi-chat-dots-fill me-2" />Chat</button>
          <button className={`social-tab-btn ${tab === 'users' ? 'active' : ''}`} role="tab" aria-selected={tab === 'users'} onClick={() => setTab('users')}><i className="bi bi-people-fill me-2" />Usuários<span className="tab-counter">{state.users.length}</span></button>
        </div>{tab === 'chat' ? <><div className="chat-panel"><Chat state={state} session={session} /></div>
          <div className="room-link-box mt-3" aria-label="Link da sala"><span className="room-link-preview">{location.hostname}/sala/{session.room.hash}</span>
            <button className="btn copy-room-link-button" onClick={() => { void copy(); }} title="Copiar URL da sala"><i className="bi bi-link-45deg me-2" /><span>Copiar URL</span></button></div>
        </> : <div className="users-tab-panel"><div className="d-flex justify-content-between align-items-center mb-2"><h5 className="text-white fw-bold mb-0">Pessoas na sala</h5><span className="room-users-count">{state.users.length} online</span></div>
          <Users users={state.users} owner={session.room.ownerDisplayName} />{!state.users.length && <span className="text-muted small">Nenhum usuário na sala.</span>}
        </div>}</div>
      </aside></div>
    </div></section>
  </>;
}
