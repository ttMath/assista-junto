import { describe, expect, it } from 'vitest';
import { ChatThrottle, mergeMessages } from '../src/features/room/chat';
import { reorderPlaylist } from '../src/features/room/playlist';
import { getUsername, setUsername, logout } from '../src/services/identity';
import { InsertMode, PlayerAction } from '../src/types/contracts';
import { message, playlist } from './fixtures';

describe('identity and wire contracts', () => {
  it('preserves the storage key, trims names and rejects overlong UTF-16 names', () => {
    setUsername('  João 🎬  '); expect(localStorage.getItem('user_name')).toBe('João 🎬');
    expect(getUsername()).toBe('João 🎬');
    expect(() => setUsername('🎬'.repeat(26))).toThrow('50 caracteres');
    expect(() => setUsername('   ')).toThrow('válido');
    logout(); expect(getUsername()).toBeNull();
  });
  it('clears invalid saved identities', () => {
    localStorage.setItem('user_name', 'a'.repeat(51)); expect(getUsername()).toBeNull(); expect(localStorage.getItem('user_name')).toBeNull();
  });
  it('keeps enums numeric and matches the .NET values', () => {
    expect(PlayerAction).toEqual({ Play: 0, Pause: 1, SeekTo: 2, ChangeVideo: 3, NextVideo: 4, PreviousVideo: 5 });
    expect(InsertMode).toEqual({ End: 0, AfterCurrent: 1, PlayNow: 2 });
  });
});
describe('chat', () => {
  it('merges overlapping history without losing live messages, ordered by UTC time', () => {
    const current = message('live', '2026-01-01T00:01:00Z');
    const result = mergeMessages([current], [message('old'), { ...current, content: 'duplicate' }]);
    expect(result.map(item => item.id)).toEqual(['old', 'live']); expect(result[1]).toBe(current);
  });
  it('permits three messages per 20 seconds, blocks the fourth for 60 seconds', () => {
    const throttle = new ChatThrottle();
    expect([throttle.allow(0), throttle.allow(1), throttle.allow(2), throttle.allow(3)]).toEqual([true, true, true, false]);
    expect(throttle.remaining(1003)).toBe(59); expect(throttle.allow(60_004)).toBe(true);
  });
  it('expires the burst window and respects remote block durations', () => {
    const throttle = new ChatThrottle(); throttle.allow(0); throttle.allow(1); throttle.allow(2);
    expect(throttle.allow(20_003)).toBe(true); throttle.block(12, 'Servidor', 20_004);
    expect(throttle.allow(21_000)).toBe(false); expect(throttle.message).toBe('Servidor'); expect(throttle.allow(32_004)).toBe(true);
  });
});
describe('playlist reorder', () => {
  it('preserves the playing item when a previous item is moved after it', () => {
    const result = reorderPlaylist(playlist, 1, playlist[0].id, 2);
    expect(result.playlist.map(item => item.id)).toEqual([playlist[1].id, playlist[2].id, playlist[0].id]);
    expect(result.currentIndex).toBe(0); expect(playlist[0].order).toBe(0);
  });
  it('clamps targets and ignores missing items', () => {
    expect(reorderPlaylist(playlist, 0, playlist[2].id, -10).currentIndex).toBe(1);
    expect(reorderPlaylist(playlist, 1, 'missing', 0).playlist).toBe(playlist);
  });
});
