import type { ConnectionStatus as Status } from '../services/realtime';
import { Icon } from './Icon';

export function ConnectionStatus({ status }: { status: Status }) {
  const text = { connected: 'Conectado à sala', connecting: 'Conectando com a sala...', reconnecting: 'Reconectando com a sala...', disconnected: 'Conexão interrompida' }[status];
  return <span className={`connection-status connection-status--${status}`} role="status"><Icon name={status === 'connected' ? 'check' : 'info'} /><span>{text}</span></span>;
}
