// Wire contracts: Application/DTOs and Domain/Enums. Enums stay numeric.
export interface PlaylistItem {
  id: string; videoId: string; title: string; thumbnailUrl: string;
  order: number; addedByDisplayName: string; addedAt: string;
}
export interface RoomState {
  videoId: string | null; currentVideoIndex: number; currentTime: number;
  isPlaying: boolean; playlist: PlaylistItem[];
}
export interface Room extends Omit<RoomState, 'videoId'> {
  id: string; hash: string; name: string; hasPassword: boolean;
  ownerDisplayName: string; isActive: boolean; usersCount: number; createdAt: string;
}
export interface CreateRoom { name: string; password: string | null }
export interface ChatMessage { id: string; userDisplayName: string; content: string; sentAt: string }
export interface RoomUser { displayName: string }
export const PlayerAction = { Play: 0, Pause: 1, SeekTo: 2, ChangeVideo: 3, NextVideo: 4, PreviousVideo: 5 } as const;
export interface PlayerActionMessage {
  action: typeof PlayerAction[keyof typeof PlayerAction];
  seekTime: number | null; videoId: string | null; expectedIndex: number | null;
}
export const InsertMode = { End: 0, AfterCurrent: 1, PlayNow: 2 } as const;
export type InsertMode = typeof InsertMode[keyof typeof InsertMode];
export interface AddVideo { videoId: string; title: string; thumbnailUrl: string }
export interface AddPlaylist { url: string; shuffle: boolean; insertMode: InsertMode }
export interface AddPlaylistResponse { items: PlaylistItem[]; totalAdded: number }
export interface Toast { id: number; message: string }
