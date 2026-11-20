import { describe, expect, it, vi } from 'vitest';
import { Api, ApiError } from '../src/services/api';
import { setUsername } from '../src/services/identity';
import { InsertMode } from '../src/types/contracts';
describe('HTTP compatibility', () => {
  it('encodes Unicode identity and sends numeric insertion mode and camelCase JSON', async () => {
    setUsername('João 🎬');
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [], totalAdded: 0 })));
    vi.stubGlobal('fetch', fetch);
    await new Api('https://api.example').addPlaylist('abc', { url: 'https://youtu.be/example', shuffle: true, insertMode: InsertMode.PlayNow });
    expect(fetch).toHaveBeenCalledWith('https://api.example/api/rooms/abc/playlist/from-url', expect.objectContaining({
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Username': encodeURIComponent('João 🎬') },
      body: JSON.stringify({ url: 'https://youtu.be/example', shuffle: true, insertMode: 2 }),
    }));
  });
  it('returns structured conflicts and plain text password errors without retry', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('{"message":"Limite de salas"}', { status: 409 }))
      .mockResolvedValueOnce(new Response('Senha incorreta', { status: 401 }));
    vi.stubGlobal('fetch', fetch);
    const api = new Api('');
    await expect(api.createRoom({ name: 'Cinema', password: null })).rejects.toThrow('Limite de salas');
    await expect(api.joinRoom('hash', 'bad')).rejects.toEqual(new ApiError('Senha incorreta', 401));
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('handles 204 and sends the same reorder body', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 })); vi.stubGlobal('fetch', fetch);
    await expect(new Api('').reorder('hash', 'guid', 2)).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith('/api/rooms/hash/playlist/reorder', expect.objectContaining({ method: 'POST', body: '{"itemId":"guid","targetIndex":2}' }));
  });
});
