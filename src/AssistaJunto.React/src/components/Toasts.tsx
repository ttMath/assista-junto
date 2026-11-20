import type { Toast } from '../types/contracts';
import { Icon } from './Icon';
export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return <div className="toast-stack" aria-live="polite">{toasts.map(toast => <div key={toast.id} className="app-toast" role="status"><Icon name="info" /><span>{toast.message}</span><button type="button" className="icon-button" aria-label="Fechar notificação" onClick={() => onDismiss(toast.id)}><Icon name="close" /></button></div>)}</div>;
}
