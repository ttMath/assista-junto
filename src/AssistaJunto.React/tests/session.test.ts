import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Api } from '../src/services/api';
import { RoomSession, type Transport } from '../src/features/room/RoomSession';
import type { RoomEvents } from '../src/services/realtime';
import type { PlayerPort } from '../src/features/player/YouTubePlayer';
import { room, roomState, playlist, message } from './fixtures';
import { setUsername } from '../src/services/identity';

function setup() {
  const api = new Api('');
  let events!: RoomEvents;
  const transport: Transport = {
    connected: true, start: vi.fn().mockResolvedValue(undefined), dispose: vi.fn().mockResolvedValue(undefined),
    sendAction: vi.fn().mockResolvedValue(undefined), sendChat: vi.fn().mockResolvedValue(undefined),
    sync: vi.fn().mockResolvedValue(undefined), jump: vi.fn().mockResolvedValue(undefined), progress: vi.fn().mockResolvedValue(undefined),
  };
  const player: PlayerPort = { load: vi.fn(), play: vi.fn(), pause: vi.fn(), stop: vi.fn(), seek: vi.fn(), time: vi.fn(() => 45), duration: vi.fn(() => 180), volume: vi.fn(), mute: vi.fn(), destroy: vi.fn() };
  const session = new RoomSession(api, room, roomState, handlers => { events = handlers; return transport; });
  session.attachPlayer(player);
  return { api, session, events, transport, player };
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01T00:00:00Z')); });
describe('room session synchronization', () => {
  it('counts only unique new messages from other users, not history or the sender', async () => {
    setUsername('Eu');
    const { session, events } = setup(); session.toggleNotifications();
    events.ReceiveChatHistory([message('history')]); expect(session.snapshot().chatActivity).toBe(0);
    events.ReceiveChatMessage({ ...message('own'), userDisplayName: 'Eu' }); expect(session.snapshot().chatActivity).toBe(0);
    events.ReceiveChatMessage(message('new')); events.ReceiveChatMessage(message('new'));
    events.ReceiveChatHistory([message('new'), message('history')]); expect(session.snapshot().chatActivity).toBe(1);
    await session.dispose();
  });
  it('sends a deliberate seek through the existing action with index and duration bounds', async () => {
    const { session, player, transport } = setup(); session.ready();
    await session.seekTo(80);
    expect(player.seek).toHaveBeenCalledExactlyOnceWith(80);
    expect(transport.sendAction).toHaveBeenCalledExactlyOnceWith({ action: 2, seekTime: 80, videoId: null, expectedIndex: 0 });
    await session.seekTo(900); expect(player.seek).toHaveBeenLastCalledWith(180);
    await session.seekTo(-20); expect(player.seek).toHaveBeenLastCalledWith(0);
    expect(transport.sendAction).toHaveBeenCalledTimes(3);
    await session.dispose();
  });
  it('does not seek for unknown duration, invalid time or an unready player', async () => {
    const { session, player, transport } = setup();
    await session.seekTo(20); expect(transport.sendAction).not.toHaveBeenCalled();
    session.ready(); vi.mocked(player.duration).mockReturnValue(0); await session.seekTo(20);
    vi.mocked(player.duration).mockReturnValue(180); await session.seekTo(Number.NaN);
    expect(transport.sendAction).not.toHaveBeenCalled(); await session.dispose();
  });
  it('loads the correct initial time and applies volume when the player becomes ready', async () => {
    const { session, player } = setup(); session.ready();
    expect(player.load).toHaveBeenCalledWith('video-0', 35, true); expect(player.volume).toHaveBeenCalledWith(80);
    await session.dispose();
  });
  it('does not seek to zero on playlist broadcasts, but starts a changed video at zero', async () => {
    const { session, player, events } = setup(); session.ready();
    events.ReceiveRoomState({ ...roomState, currentTime: 0 }); expect(player.seek).not.toHaveBeenCalled();
    events.ReceiveRoomState({ ...roomState, videoId: 'video-1', currentVideoIndex: 1, currentTime: 0 });
    expect(player.load).toHaveBeenLastCalledWith('video-1', 0, true); await session.dispose();
  });
  it('suppresses echo during the 1500ms remote cooldown and later emits exactly one action', async () => {
    const { session, player, events, transport } = setup(); session.ready();
    events.ReceivePlayerAction({ action: 1, seekTime: 40, videoId: null, expectedIndex: 0 });
    expect(player.pause).toHaveBeenCalled(); session.onPlayerState(2); expect(transport.sendAction).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1501); session.onPlayerState(1);
    expect(transport.sendAction).toHaveBeenCalledExactlyOnceWith({ action: 0, seekTime: 45, videoId: null, expectedIndex: 0 });
    await session.dispose();
  });
  it('handles remote seek at zero and stops a cleared player', async () => {
    const { session, player, events } = setup(); session.ready();
    events.ReceivePlayerAction({ action: 2, seekTime: 0, videoId: null, expectedIndex: 0 }); expect(player.seek).toHaveBeenCalledWith(0);
    events.PlaylistCleared(); expect(player.stop).toHaveBeenCalled(); expect(session.snapshot().playlist).toEqual([]);
    await session.dispose();
  });
  it('sends expectedIndex for navigation, syncs the sender and handles remote next', async () => {
    const { session, transport, events } = setup();
    await session.next(); expect(transport.sendAction).toHaveBeenCalledWith({ action: 4, seekTime: null, videoId: null, expectedIndex: 0 });
    expect(transport.sync).toHaveBeenCalledTimes(1);
    events.ReceivePlayerAction({ action: 5, seekTime: null, videoId: null, expectedIndex: 0 }); expect(transport.sync).toHaveBeenCalledTimes(2);
    await session.dispose();
  });
  it('reports progress every three seconds, keeps volume local and cleans up timers', async () => {
    const { session, transport, player } = setup(); await session.start(); session.ready();
    session.setVolume(30); session.toggleMute(); expect(transport.sendAction).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(3000); expect(transport.progress).toHaveBeenCalledExactlyOnceWith(45, 0);
    await session.dispose(); await vi.advanceTimersByTimeAsync(9000);
    expect(transport.progress).toHaveBeenCalledTimes(1); expect(player.destroy).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
  });
  it('merges reconnect history and ignores repeated live messages', async () => {
    const { session, events } = setup(); session.toggleNotifications();
    events.ReceiveChatMessage(message('live', '2026-01-01T00:01:00Z'));
    events.ReceiveChatHistory([message('old'), message('live', '2026-01-01T00:01:00Z')]);
    events.ReceiveChatMessage(message('live')); expect(session.snapshot().messages.map(item => item.id)).toEqual(['old', 'live']);
    await session.dispose();
  });
  it('honors the server chat block countdown and refuses sending while blocked', async () => {
    const { session, transport, events } = setup(); events.ChatBlocked(2, 'Aguarde');
    await session.sendChat('blocked'); expect(transport.sendChat).not.toHaveBeenCalled(); expect(session.snapshot().blockedSeconds).toBe(2);
    await vi.advanceTimersByTimeAsync(2000); expect(session.snapshot().blockedSeconds).toBe(0);
    await session.sendChat('ok'); expect(transport.sendChat).toHaveBeenCalledWith('ok'); await session.dispose();
  });
  it('rolls back failed optimistic reorder without overwriting a newer server order', async () => {
    const { session, api, events } = setup();
    let reject!: (error: Error) => void;
    vi.spyOn(api, 'reorder').mockImplementation(() => new Promise((_resolve, fail) => { reject = fail; }));
    const pending = session.reorder(playlist[0].id, 2); expect(session.snapshot().currentVideoIndex).toBe(2);
    events.ReceiveRoomState({ ...roomState, playlist: [...playlist].reverse(), currentVideoIndex: 2 });
    reject(new Error('Falha')); await pending;
    expect(session.snapshot().playlist).toEqual([...playlist].reverse()); expect(session.snapshot().reordering).toBe(false); await session.dispose();
  });
  it('restores the original order on failure if no newer update arrived', async () => {
    const { session, api } = setup(); vi.spyOn(api, 'reorder').mockRejectedValue(new Error('Falha'));
    await session.reorder(playlist[0].id, 2); expect(session.snapshot().playlist).toEqual(playlist); expect(session.snapshot().currentVideoIndex).toBe(0);
    await session.dispose();
  });
  it('does not create a progress timer when disposed while connecting', async () => {
    const { session, transport } = setup(); let connected!: () => void;
    vi.mocked(transport.start).mockImplementation(() => new Promise(resolve => { connected = resolve; }));
    const starting = session.start(); await session.dispose(); connected(); await starting; expect(vi.getTimerCount()).toBe(0);
  });
});
