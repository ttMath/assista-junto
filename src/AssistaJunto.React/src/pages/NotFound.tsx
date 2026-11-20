import { Link } from 'react-router-dom';
import { Metadata } from '../components/Metadata';
import { Icon } from '../components/Icon';

export function NotFound() {
  return <section className="not-found"><Metadata title="Página não encontrada — Assista Junto" /><div className="dialog-symbol"><Icon name="film" /></div><p className="eyebrow">ESSA CENA FICOU DE FORA</p><h1>Página não encontrada</h1><p>O endereço pode ter mudado. Sua próxima sessão começa na tela inicial.</p><Link className="button button--primary" to="/">Voltar ao início</Link></section>;
}
