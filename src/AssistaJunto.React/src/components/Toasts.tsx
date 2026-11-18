import type { Toast } from '../types/contracts';
export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1080 }} aria-live="polite">{toasts.map(toast => <div key={toast.id} className="custom-toast p-3 mb-2 d-flex align-items-center justify-content-between animate__animated animate__fadeInRight" role="status">
    <div className="d-flex align-items-center gap-2"><i className="bi bi-info-circle-fill" /><span className="fw-medium">{toast.message}</span></div>
    <button type="button" className="btn-close btn-close-white ms-3" aria-label="Fechar notificação" onClick={() => onDismiss(toast.id)} />
  </div>)}</div>;
}
