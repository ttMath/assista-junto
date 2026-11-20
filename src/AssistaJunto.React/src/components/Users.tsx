import { memo } from 'react';
import type { RoomUser } from '../types/contracts';
import { Icon } from './Icon';
const colors = [
  ['#5865F2', '#dfe1ff'], ['#ED4245', '#ffd6d6'], ['#3BA55C', '#d4f5de'], ['#FAA61A', '#fff1d6'],
  ['#EB459E', '#ffd6ec'], ['#9B59B6', '#ead6ff'], ['#1ABC9C', '#d6f5ef'], ['#E67E22', '#ffe3cc'],
  ['#2196F3', '#d6ecff'], ['#F47FBE', '#ffe0f0'], ['#7289DA', '#dce2f7'], ['#43B581', '#d6f0e2'],
];
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const hash = name.split('').reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const [background, foreground] = colors[hash % colors.length];
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => [...part][0] ?? '').join('').toUpperCase() || '?';
  return <span className="user-avatar" aria-hidden="true" style={{ width: size, height: size, minWidth: size, background: `linear-gradient(145deg, ${background}, ${background}99)`, color: foreground }}>{initials}</span>;
}
export const Users = memo(function Users({ users, owner }: { users: RoomUser[]; owner: string }) {
  return <section className="participants"><div className="panel-heading"><div><h2>Pessoas na sala</h2><p>Boas companhias, a mesma sessão.</p></div><Icon name="people" /></div>
    <p className="participants-count">{users.length} online</p>
    {!users.length && <div className="panel-empty"><Icon name="people" /><h3>Sua companhia está chegando</h3><p>Nenhum usuário na sala.</p></div>}
    <ul className="participants-list">{users.map((user, index) => {
      const isOwner = user.displayName.toLowerCase() === owner.toLowerCase();
      return <li key={`${user.displayName}-${index}`} className="participant"><Avatar name={user.displayName} /><div className="participant-info"><strong>{user.displayName}</strong><span>{isOwner ? 'Criador da sala' : 'Participante'}</span></div>{isOwner && <span className="owner-badge" title="Dono da Sala"><Icon name="crown" /><span>Dono</span></span>}<span className="presence-label"><span className="presence-dot" />Online</span></li>;
    })}</ul>
  </section>;
});
