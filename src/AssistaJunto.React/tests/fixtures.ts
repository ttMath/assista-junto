import type { ChatMessage, PlaylistItem, Room, RoomState } from '../src/types/contracts';
export const playlist: PlaylistItem[] = [0, 1, 2].map(index => ({
  id: `00000000-0000-0000-0000-00000000000${index}`, videoId: `video-${index}`, title: `Vídeo ${index}`,
  thumbnailUrl: '', order: index, addedByDisplayName: 'Dono', addedAt: '2026-01-01T00:00:00Z',
}));
export const room: Room = {
  id: 'room-id', hash: 'abc123', name: 'Cinema', hasPassword: false, ownerDisplayName: 'Dono', isActive: true,
  usersCount: 0, currentVideoIndex: 0, currentTime: 35, isPlaying: true, playlist, createdAt: '2026-01-01T00:00:00Z',
};
export const roomState: RoomState = { videoId: playlist[0].videoId, currentVideoIndex: 0, currentTime: 35, isPlaying: true, playlist };
export const message = (id: string, sentAt = '2026-01-01T00:00:00Z'): ChatMessage => ({ id, sentAt, userDisplayName: 'Dono', content: `Mensagem ${id}` });
