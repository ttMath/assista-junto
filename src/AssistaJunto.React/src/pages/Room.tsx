import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Api, ApiError } from '../services/api';
import { getUsername, setUsername, useUsername } from '../services/identity';
import type { Room as RoomModel, RoomState } from '../types/contracts';
import { NamePrompt, PasswordModal } from '../components/Modals';
import { RoomSession } from '../features/room/RoomSession';
import { Metadata } from '../components/Metadata';
import { VideoSection } from '../components/VideoSection';
import { RoomSidebar, readRoomTab, rememberRoomTab, type RoomTab } from '../components/RoomSidebar';
import { RoomSettings } from '../components/RoomSettings';
import type { PageOutlet } from '../components/RoomChrome';
import { Toasts } from '../components/Toasts';
import { Icon } from '../components/Icon';
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
  return <div className="room-access"><Metadata room />
    {!username ? <NamePrompt onConfirm={name => { try { setUsername(name); } catch (error) { setError((error as Error).message); } }} />
      : privateRoom ? <PasswordModal onClose={home} onConfirm={value => { void password(value); }} invalid={invalid} busy={busy} />
      : admitted && room ? <ActiveRoom key={room.hash} api={api} room={room} initial={initial} />
      : !error ? <div className="room-loading"><span className="spinner" /><p className="loading-message">Sincronizando com a sala...</p></div> : null}
    {error && <div className="room-access-error" role="alert">{error} <button className="button button--quiet button--small" onClick={() => window.location.reload()}>Tentar novamente</button></div>}
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

function RoomView({ api, session }: { api: Api; session: RoomSession }) {
  const state = useSyncExternalStore(session.subscribe, session.snapshot);
  const { setRoomChrome } = useOutletContext<PageOutlet>();
  const [tab, setTab] = useState<RoomTab>(() => readRoomTab(session.room.hash));
  const [cinema, setCinema] = useState(false);
  const [settings, setSettings] = useState(false);
  const [lastRead, setLastRead] = useState(0);
  const selectTab = useCallback((tab: RoomTab) => { setTab(tab); rememberRoomTab(session.room.hash, tab); }, [session.room.hash]);
  const toggleCinema = useCallback(() => setCinema(current => !current), []);
  const openSettings = useCallback(() => setSettings(true), []);
  const copy = useCallback(async () => {
    try { await navigator.clipboard.writeText(`${location.origin}/sala/${session.room.hash}`); session.toast('URL da sala copiada.'); }
    catch { session.toast('Não foi possível copiar a URL da sala.'); }
  }, [session]);
  useEffect(() => {
    setRoomChrome({ name: session.room.name, connection: state.connection, cinema, invite: () => { void copy(); }, toggleCinema, settings: openSettings });
    return () => setRoomChrome(null);
  }, [setRoomChrome, session.room.name, state.connection, cinema, copy, toggleCinema, openSettings]);
  useEffect(() => {
    if (tab === 'chat' && !cinema) setLastRead(state.chatActivity);
  }, [tab, cinema, state.chatActivity]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && cinema && !settings && !document.querySelector('[role="dialog"]')) setCinema(false);
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [cinema, settings]);
  const addVideo = useCallback(() => {
    setCinema(false); selectTab('queue');
    const focus = () => requestAnimationFrame(() => document.getElementById('youtube-url')?.focus());
    if (document.fullscreenElement) void document.exitFullscreen().then(focus).catch(session.error); else focus();
  }, [selectTab, session]);
  const unread = tab === 'chat' && !cinema ? 0 : Math.max(0, state.chatActivity - lastRead);
  return <div className={`room-page ${cinema ? 'cinema-mode' : ''}`}>
    <Toasts toasts={state.toasts} onDismiss={session.dismissToast} />
    {state.connection !== 'connected' && <div className="connection-banner" role="status"><Icon name="info" /><span>{state.connection === 'disconnected' ? 'Conexão com a sala interrompida.' : state.connection === 'reconnecting' ? 'Reconectando com a sala...' : 'Conectando com a sala...'}</span>{state.connection === 'disconnected' && <button className="button button--quiet button--small" onClick={() => window.location.reload()}>Reconectar</button>}</div>}
    <div className="room-layout">
      <VideoSection session={session} current={state.playlist[state.currentVideoIndex]} isPlaying={state.isPlaying} connection={state.connection} ready={state.playerReady} volume={state.volume} muted={state.muted} cinema={cinema} onCinema={toggleCinema} onAddVideo={addVideo} />
      <RoomSidebar api={api} session={session} state={state} tab={tab} onTab={selectTab} unread={unread} cinema={cinema} />
    </div>
    {settings && <RoomSettings session={session} state={state} onClose={() => setSettings(false)} />}
  </div>;
}
