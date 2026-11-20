import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { Api } from './services/api';
import { readConfig } from './services/config';
import './styles/main.scss';

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(error, info.componentStack); }
  render() { return this.state.failed ? <Failure /> : this.props.children; }
}
function Failure({ message = 'Ocorreu um erro inesperado.' }: { message?: string }) {
  return <div className="app-failure" role="alert"><h1>Vamos tentar de novo?</h1><p>{message}</p><button className="button button--primary" onClick={() => location.reload()}>Recarregar</button></div>;
}
const root = createRoot(document.getElementById('app')!);
root.render(<div className="room-loading" role="status"><span className="spinner" /><p>SINCRONIZANDO AMBIENTE...</p></div>);
void readConfig().then(baseUrl => root.render(<StrictMode><ErrorBoundary><App api={new Api(baseUrl)} /></ErrorBoundary></StrictMode>))
  .catch(error => root.render(<Failure message={error instanceof Error ? error.message : 'Falha ao carregar o aplicativo.'} />));
