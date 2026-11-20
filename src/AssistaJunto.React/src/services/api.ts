import { getUsername } from './identity';
import type { AddPlaylist, AddPlaylistResponse, AddVideo, CreateRoom, PlaylistItem, Room, RoomState } from '../types/contracts';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}
export class Api {
  constructor(public readonly baseUrl: string) {}
  private async request<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
    const headers: Record<string, string> = {};
    const username = getUsername();
    if (username) headers['X-Username'] = encodeURIComponent(username);
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    // .NET HttpClient's default timeout is 100 seconds. No automatic mutation retry.
    const timeout = AbortSignal.timeout(100_000);
    const response = await fetch(`${this.baseUrl}/api/rooms${path}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    const content = await response.text();
    if (!response.ok) {
      let message = content || `Falha na requisição (${response.status}).`;
      try {
        const error: unknown = JSON.parse(content);
        if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') message = error.message;
      } catch { /* Plain-text API errors are also valid. */ }
      throw new ApiError(message, response.status);
    }
    return content ? JSON.parse(content) as T : undefined as T;
  }
  getRooms = (signal?: AbortSignal) => this.request<Room[]>('', 'GET', undefined, signal);
  createRoom = (room: CreateRoom) => this.request<Room>('', 'POST', room);
  getRoom = (hash: string, signal?: AbortSignal) => this.request<Room>(`/${encodeURIComponent(hash)}`, 'GET', undefined, signal);
  joinRoom = (hash: string, password: string | null) => this.request<RoomState>(`/${encodeURIComponent(hash)}/join`, 'POST', { password });
  deleteRoom = (hash: string) => this.request<void>(`/${encodeURIComponent(hash)}`, 'DELETE');
  getPlaylist = (hash: string) => this.request<PlaylistItem[]>(`/${encodeURIComponent(hash)}/playlist`);
  addVideo = (hash: string, video: AddVideo) => this.request<PlaylistItem>(`/${encodeURIComponent(hash)}/playlist`, 'POST', video);
  addPlaylist = (hash: string, request: AddPlaylist) => this.request<AddPlaylistResponse>(`/${encodeURIComponent(hash)}/playlist/from-url`, 'POST', request);
  reorder = (hash: string, itemId: string, targetIndex: number) => this.request<void>(`/${encodeURIComponent(hash)}/playlist/reorder`, 'POST', { itemId, targetIndex });
  removeVideo = (hash: string, id: string) => this.request<void>(`/${encodeURIComponent(hash)}/playlist/${encodeURIComponent(id)}`, 'DELETE');
  clearPlaylist = (hash: string) => this.request<void>(`/${encodeURIComponent(hash)}/playlist`, 'DELETE');
  shuffle = (hash: string) => this.request<void>(`/${encodeURIComponent(hash)}/playlist/shuffle`, 'POST');
}
