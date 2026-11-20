import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Api } from '../src/services/api';
import { RoomSession, type Transport } from '../src/features/room/RoomSession';
import { RoomSidebar, type RoomTab } from '../src/components/RoomSidebar';
import { Chat } from '../src/components/Chat';
import { formatPlaybackTime } from '../src/components/VideoControls';
import { message, room, roomState } from './fixtures';

function setup() {
  const api = new Api('');
  const transport: Transport = { connected: true, start: vi.fn().mockResolvedValue(undefined), dispose: vi.fn().mockResolvedValue(undefined), sendAction: vi.fn().mockResolvedValue(undefined), sendChat: vi.fn().mockResolvedValue(undefined), sync: vi.fn().mockResolvedValue(undefined), jump: vi.fn().mockResolvedValue(undefined), progress: vi.fn().mockResolvedValue(undefined) };
  const session = new RoomSession(api, room, { ...roomState, playlist: roomState.playlist.map(item => ({ ...item, thumbnailUrl: '/favicon.png' })) }, () => transport);
  return { api, session, transport };
}

describe('cinematic room panels', () => {
  it('keeps the required order, supports keyboard navigation and preserves a hidden chat draft', async () => {
    const { api, session } = setup();
    function Panels() {
      const [tab, setTab] = useState<RoomTab>('queue');
      return <RoomSidebar api={api} session={session} state={session.snapshot()} tab={tab} onTab={setTab} unread={0} cinema={false} />;
    }
    render(<Panels />); const user = userEvent.setup();
    const tabs = screen.getAllByRole('tab'); expect(tabs.map(tab => tab.getAttribute('aria-label'))).toEqual(['Fila', 'Chat', 'Pessoas']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    tabs[0].focus(); await user.keyboard('{ArrowRight}'); expect(tabs[1]).toHaveFocus();
    await user.type(screen.getByRole('textbox', { name: 'Mensagem' }), 'Rascunho preservado');
    await user.click(tabs[2]); await user.click(tabs[1]);
    expect(screen.getByRole('textbox', { name: 'Mensagem' })).toHaveValue('Rascunho preservado');
    tabs[1].focus(); await user.keyboard('{Home}'); expect(tabs[0]).toHaveFocus();
    await session.dispose();
  });
  it('does not force the reader to the bottom when a new message arrives', async () => {
    const { session } = setup();
    const state = { ...session.snapshot(), messages: [message('a')] };
    const view = render(<Chat session={session} state={state} active />);
    const log = screen.getByRole('log');
    Object.defineProperties(log, { scrollHeight: { configurable: true, value: 1200 }, clientHeight: { configurable: true, value: 250 } });
    log.scrollTop = 100; fireEvent.scroll(log);
    view.rerender(<Chat session={session} state={{ ...state, messages: [...state.messages, message('b')] }} active />);
    expect(log.scrollTop).toBe(100); expect(screen.getByRole('button', { name: 'Ver novas mensagens' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Ver novas mensagens' })); expect(log.scrollTop).toBe(1200);
    await session.dispose();
  });
  it('formats real media time without inventing unavailable duration', () => {
    expect(formatPlaybackTime(0)).toBe('0:00'); expect(formatPlaybackTime(65)).toBe('1:05');
    expect(formatPlaybackTime(3661)).toBe('1:01:01'); expect(formatPlaybackTime(Number.NaN)).toBe('0:00');
  });
});
