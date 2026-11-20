import { useLayoutEffect, useRef, useState } from 'react';
import type { RoomSession, SessionState } from '../features/room/RoomSession';
import { Avatar } from './Users';
import { Icon } from './Icon';

export function Chat({ state, session, active }: { state: SessionState; session: RoomSession; active: boolean }) {
  const [input, setInput] = useState(''); const [sending, setSending] = useState(false); const [newMessages, setNewMessages] = useState(false);
  const pending = useRef(false); const messages = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true); const position = useRef(0); const previousCount = useRef(0);
  useLayoutEffect(() => {
    const element = messages.current;
    if (!active || !element) return;
    if (nearBottom.current) { element.scrollTop = element.scrollHeight; setNewMessages(false); }
    else { element.scrollTop = position.current; if (state.messages.length > previousCount.current) setNewMessages(true); }
    previousCount.current = state.messages.length;
  }, [state.messages.length, active]);
  const send = async () => {
    if (pending.current || state.blockedSeconds || !input.trim()) return;
    pending.current = true; setSending(true); const content = input; setInput(''); nearBottom.current = true;
    try { await session.sendChat(content); } catch (error) { session.error(error); setInput(content); }
    finally { pending.current = false; setSending(false); }
  };
  const scrollToLatest = () => {
    if (messages.current) messages.current.scrollTop = messages.current.scrollHeight;
    nearBottom.current = true; setNewMessages(false);
  };
  return <section className="chat-panel" aria-label="Conversa da sala">
    <div className="panel-heading chat-heading"><div><h2>Conversa da sessão</h2><p>O comentário também faz parte.</p></div><button type="button" className={`sound-toggle ${state.notificationMuted ? 'is-muted' : ''}`} title={state.notificationMuted ? 'Ativar som de novas mensagens' : 'Silenciar som de novas mensagens'} aria-label={state.notificationMuted ? 'Ativar som de novas mensagens' : 'Silenciar som de novas mensagens'} onClick={session.toggleNotifications}><Icon name={state.notificationMuted ? 'muted' : 'volume'} /><span>{state.notificationMuted ? 'Silenciado' : 'Som ativo'}</span></button></div>
    {!!state.blockedSeconds && <div className="chat-block-alert" role="alert"><Icon name="info" /><span>{state.blockMessage} <strong>({state.blockedSeconds} s)</strong></span></div>}
    <div className="chat-messages-area" ref={messages} role="log" aria-label="Mensagens do chat" aria-live="polite" aria-relevant="additions" tabIndex={active ? 0 : -1}
      onScroll={event => { const element = event.currentTarget; position.current = element.scrollTop; nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 64; if (nearBottom.current) setNewMessages(false); }}>
      {!state.messages.length ? <div className="panel-empty"><Icon name="chat" /><h3>A primeira mensagem é sua</h3><p>Nenhuma mensagem ainda...</p></div> : state.messages.map(message => <article className="chat-message" key={message.id}>
        <Avatar name={message.userDisplayName} size={32} /><div className="message-content"><div className="message-heading"><strong>{message.userDisplayName}</strong><time dateTime={message.sentAt}>{new Date(message.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time></div><p className="message-body">{message.content}</p></div>
      </article>)}
    </div>
    {newMessages && <button className="new-messages-button" onClick={scrollToLatest}>Ver novas mensagens</button>}
    <form className="chat-compose" onSubmit={event => { event.preventDefault(); void send(); }}><label className="sr-only" htmlFor="chat-message">Mensagem</label><input id="chat-message" className="text-input" placeholder="Digite uma mensagem..." value={input} onChange={event => setInput(event.target.value)} disabled={!!state.blockedSeconds} autoComplete="off" /><button className="button button--primary chat-send" title="Enviar mensagem" aria-label="ENVIAR" disabled={!!state.blockedSeconds || sending}>{sending ? <span className="spinner" /> : <Icon name="send" />}</button></form>
  </section>;
}
