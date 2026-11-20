import { useSyncExternalStore } from 'react';

export const MAX_USERNAME_LENGTH = 50;
const listeners = new Set<() => void>();
export function getUsername(): string | null {
  const value = localStorage.getItem('user_name');
  if (value === null) return null;
  const name = value.trim();
  if (!name || name.length > MAX_USERNAME_LENGTH) {
    localStorage.removeItem('user_name');
    return null;
  }
  return name;
}
export function setUsername(value: string) {
  const name = value.trim();
  if (!name) throw new Error('Informe um nome de usuário válido.');
  if (name.length > MAX_USERNAME_LENGTH) throw new Error('Nome com no máximo 50 caracteres.');
  localStorage.setItem('user_name', name);
  listeners.forEach(listener => listener());
}
export function logout() {
  localStorage.removeItem('user_name');
  listeners.forEach(listener => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function useUsername() { return useSyncExternalStore(subscribe, getUsername); }
