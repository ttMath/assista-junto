import type { ChatMessage } from '../../types/contracts';

export function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]) {
  return [...new Map([...incoming, ...existing].map(message => [message.id, message])).values()]
    .sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt));
}
export class ChatThrottle {
  private sentAt: number[] = [];
  blockedUntil = 0;
  message = '';
  remaining(now = Date.now()) { return Math.max(0, Math.ceil((this.blockedUntil - now) / 1000)); }
  block(seconds: number, message: string, now = Date.now()) {
    this.blockedUntil = now + Math.max(1, seconds) * 1000;
    this.message = message || 'Chat temporariamente bloqueado por spam.';
    this.sentAt = [];
  }
  allow(now = Date.now()) {
    if (this.remaining(now)) return false;
    this.sentAt = this.sentAt.filter(time => time >= now - 20_000);
    if (this.sentAt.length >= 3) {
      this.block(60, 'Muitas mensagens seguidas. Aguarde para enviar novamente.', now);
      return false;
    }
    this.sentAt.push(now);
    return true;
  }
}
