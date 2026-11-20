import type { RoomSession, SessionState } from '../features/room/RoomSession';
import { Modal } from './Modals';
import { Icon } from './Icon';

export function RoomSettings({ session, state, onClose }: { session: RoomSession; state: SessionState; onClose: () => void }) {
  return <Modal title="Configurações da sessão" onClose={onClose}><div className="dialog-card">
    <div className="dialog-heading"><div className="dialog-symbol"><Icon name="settings" /></div><button className="icon-button" aria-label="Fechar" onClick={onClose}><Icon name="close" /></button></div>
    <h2>Do seu jeito</h2><p className="dialog-description">Preferências locais para aproveitar a sessão.</p>
    <label className="field-label" htmlFor="settings-volume">Volume do vídeo<span>{state.volume}%</span></label><input id="settings-volume" type="range" min="0" max="100" value={state.volume} onChange={event => session.setVolume(Number(event.target.value))} aria-label="Volume da sessão" />
    <div className="setting-row"><div><strong>Som do vídeo</strong><p>Controle apenas neste dispositivo.</p></div><button className="button button--quiet button--small" aria-pressed={!state.muted} onClick={session.toggleMute}><Icon name={state.muted ? 'muted' : 'volume'} />{state.muted ? 'Ativar' : 'Silenciar'}</button></div>
    <div className="setting-row"><div><strong>Som das mensagens</strong><p>Notificações de outras pessoas.</p></div><button className="button button--quiet button--small" aria-pressed={!state.notificationMuted} onClick={session.toggleNotifications}><Icon name={state.notificationMuted ? 'muted' : 'volume'} />{state.notificationMuted ? 'Ativar' : 'Silenciar'}</button></div>
    <button className="button button--primary button--full" onClick={onClose}>Pronto</button>
  </div></Modal>;
}
