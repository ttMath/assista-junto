import { useEffect, useRef, useState } from 'react';
import type { RoomSession, SessionState } from '../features/room/RoomSession';
import { Avatar } from './Users';
export function Chat({ state, session }: { state: SessionState; session: RoomSession }) {
  const [input, setInput] = useState(''); const [sending, setSending] = useState(false);
  const pending = useRef(false); const messages = useRef<HTMLDivElement>(null);
  useEffect(() => { if (messages.current) messages.current.scrollTop = messages.current.scrollHeight; }, [state.messages.length]);
  const send = async () => {
    if (pending.current || state.blockedSeconds || !input.trim()) return;
    pending.current = true; setSending(true); const content = input; setInput('');
    try { await session.sendChat(content); } catch (error) { session.error(error); setInput(content); }
    finally { pending.current = false; setSending(false); }
  };
  return <div className="legacy-chat"><div className="chat-wrapper shadow-sm rounded-3 overflow-hidden">
    <div className="chat-header p-3 d-flex align-items-center justify-content-between"><h5 className="mb-0 fw-bold text-white"><i className="bi bi-chat-dots me-2" />CHAT</h5>
      <div className="legacy-sound"><button type="button" className={`btn sound-toggle-button ${state.notificationMuted ? 'is-muted' : 'is-active'}`} title={state.notificationMuted ? 'Ativar som de novas mensagens' : 'Silenciar som de novas mensagens'} aria-label={state.notificationMuted ? 'Ativar som de novas mensagens' : 'Silenciar som de novas mensagens'} onClick={session.toggleNotifications}>
        <img className="sound-toggle-icon" src={`/icons/sound-${state.notificationMuted ? 'off' : 'on'}.svg`} alt="" aria-hidden="true" /><span>{state.notificationMuted ? 'Silenciado' : 'Som ativo'}</span>
      </button></div>
    </div>
    {!!state.blockedSeconds && <div className="chat-block-alert mx-3 mt-3 mb-2" role="alert"><i className="bi bi-shield-exclamation me-2" /><span>{state.blockMessage}</span><strong className="ms-1">({state.blockedSeconds} s)</strong></div>}
    <div className="chat-messages-area" ref={messages} role="log" aria-label="Mensagens do chat" aria-live="polite">
      {!state.messages.length ? <div className="d-flex align-items-center justify-content-center h-100"><p className="text-muted small italic">Nenhuma mensagem ainda...</p></div> : state.messages.map(message => <div className="message-item p-3" key={message.id}>
        <div className="d-flex align-items-start gap-2"><Avatar name={message.userDisplayName} /><div className="message-content flex-grow-1">
          <div className="d-flex justify-content-between align-items-center mb-1"><span className="fw-bold sender-name">{message.userDisplayName}</span>
            <span className="text-muted sent-time">{new Date(message.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div>
          <div className="message-body">{message.content}</div>
        </div></div>
      </div>)}
    </div>
    <form className="chat-input-area p-3 border-top" onSubmit={event => { event.preventDefault(); void send(); }}><div className="input-group">
      <input className="form-control chat-input py-2 shadow-none" placeholder="Digite uma mensagem..." aria-label="Mensagem" value={input} onChange={event => setInput(event.target.value)} disabled={!!state.blockedSeconds} />
      <button className="btn btn-primary send-btn px-3 fw-bold" disabled={!!state.blockedSeconds || sending}>ENVIAR</button>
    </div></form>
  </div></div>;
}
