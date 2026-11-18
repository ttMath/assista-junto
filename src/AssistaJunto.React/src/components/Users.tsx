import type { RoomUser } from '../types/contracts';
const colors = [
  ['#5865F2', '#dfe1ff'], ['#ED4245', '#ffd6d6'], ['#3BA55C', '#d4f5de'], ['#FAA61A', '#fff1d6'],
  ['#EB459E', '#ffd6ec'], ['#9B59B6', '#ead6ff'], ['#1ABC9C', '#d6f5ef'], ['#E67E22', '#ffe3cc'],
  ['#2196F3', '#d6ecff'], ['#F47FBE', '#ffe0f0'], ['#7289DA', '#dce2f7'], ['#43B581', '#d6f0e2'],
];
export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  // C# sums UTF-16 chars, including both halves of a surrogate pair.
  const hash = name.split('').reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const [background, foreground] = colors[hash % colors.length];
  return <div className="user-avatar" aria-hidden="true" style={{ width: size, height: size, minWidth: size, background, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55} fill={foreground}><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></svg>
  </div>;
}
export function Users({ users, owner }: { users: RoomUser[]; owner: string }) {
  return <div className="legacy-users"><div className="users-section mt-4"><div className="d-flex align-items-center gap-2 mb-3">
    <div className="status-dot" /><h6 className="text-uppercase fw-black text-white mb-0 ls-wider users-title">Online Agora — {users.length}</h6>
  </div><div className="users-container d-flex flex-wrap gap-2">
    {!users.length && <div className="text-muted small italic px-3">Sala vazia...</div>}
    {users.map((user, index) => <div key={`${user.displayName}-${index}`} className="user-card-pill shadow-sm" title={user.displayName}>
      <div className="avatar-wrapper"><Avatar name={user.displayName} size={26} /><div className="online-indicator" /></div>
      <span className="user-name">{user.displayName}</span>{user.displayName === owner && <span className="owner-badge" title="Dono da Sala">👑</span>}
    </div>)}
  </div></div></div>;
}
