import type { KeyboardEvent } from 'react';
import type { Api } from '../services/api';
import type { RoomSession, SessionState } from '../features/room/RoomSession';
import { Playlist } from './Playlist';
import { Chat } from './Chat';
import { Users } from './Users';
import { Icon } from './Icon';

export type RoomTab = 'queue' | 'chat' | 'people';
export function readRoomTab(hash: string): RoomTab {
  try { const value = sessionStorage.getItem(`room-tab:${hash}`); if (value === 'queue' || value === 'chat' || value === 'people') return value; } catch { /* Preferences are optional in restricted browsers. */ }
  return 'queue';
}
export function rememberRoomTab(hash: string, tab: RoomTab) {
  try { sessionStorage.setItem(`room-tab:${hash}`, tab); } catch { /* Keep in-memory navigation working. */ }
}
const tabs = [
  { id: 'queue', label: 'Fila', icon: 'queue' },
  { id: 'chat', label: 'Chat', icon: 'chat' },
  { id: 'people', label: 'Pessoas', icon: 'people' },
] as const;
export function RoomSidebar({ api, session, state, tab, onTab, unread, cinema }: {
  api: Api; session: RoomSession; state: SessionState; tab: RoomTab; onTab: (tab: RoomTab) => void; unread: number; cinema: boolean;
}) {
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault(); onTab(tabs[next].id); document.getElementById(`room-tab-${tabs[next].id}`)?.focus();
  };
  return <aside className="room-sidebar" aria-label="Painel da sala" hidden={cinema}>
    <div className="room-tabs" role="tablist" aria-label="Painéis da sala">{tabs.map((item, index) => <button key={item.id} id={`room-tab-${item.id}`} role="tab" className={`room-tab ${tab === item.id ? 'is-active' : ''}`} aria-label={item.label} aria-selected={tab === item.id} aria-controls={`room-panel-${item.id}`} aria-describedby={item.id === 'chat' && unread ? 'unread-chat-description' : undefined} tabIndex={tab === item.id ? 0 : -1} onClick={() => onTab(item.id)} onKeyDown={event => navigate(event, index)}>
      <Icon name={item.icon} /><span>{item.label}</span>{item.id === 'queue' && <span className="tab-count" aria-hidden="true">{state.playlist.length}</span>}{item.id === 'people' && <span className="tab-count" aria-hidden="true">{state.users.length}</span>}{item.id === 'chat' && !!unread && <span className="tab-count unread-count" data-testid="chat-unread" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
    </button>)}</div>
    {!!unread && <span className="sr-only" id="unread-chat-description">{unread} novas mensagens não lidas</span>}
    <div className="room-tab-panel" id="room-panel-queue" role="tabpanel" aria-labelledby="room-tab-queue" hidden={tab !== 'queue'}><Playlist api={api} session={session} state={state} active={!cinema && tab === 'queue'} /></div>
    <div className="room-tab-panel" id="room-panel-chat" role="tabpanel" aria-labelledby="room-tab-chat" hidden={tab !== 'chat'}><Chat session={session} state={state} active={!cinema && tab === 'chat'} /></div>
    <div className="room-tab-panel" id="room-panel-people" role="tabpanel" aria-labelledby="room-tab-people" hidden={tab !== 'people'}><Users users={state.users} owner={session.room.ownerDisplayName} /></div>
    <footer className="room-sidebar-footer"><span className={state.connection === 'connected' ? 'is-connected' : ''}><Icon name="people" />{state.users.length} {state.users.length === 1 ? 'pessoa na sala' : 'pessoas na sala'}</span><span><Icon name={session.room.hasPassword ? 'lock' : 'film'} />{session.room.hasPassword ? 'Sala privada' : 'Sala aberta'}</span></footer>
  </aside>;
}
