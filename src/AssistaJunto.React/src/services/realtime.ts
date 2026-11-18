import { HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import type { AddVideo, ChatMessage, PlayerActionMessage, PlaylistItem, RoomState, RoomUser } from '../types/contracts';

export interface RoomEvents {
  ReceiveRoomState: (state: RoomState) => void;
  ReceivePlayerAction: (action: PlayerActionMessage) => void;
  ReceiveChatMessage: (message: ChatMessage) => void;
  ReceiveChatHistory: (messages: ChatMessage[]) => void;
  PlaylistUpdated: (item: PlaylistItem) => void;
  PlaylistCleared: () => void;
  UserJoined: (user: RoomUser) => void;
  UserLeft: (name: string) => void;
  ReceiveUserList: (users: RoomUser[]) => void;
  ChatBlocked: (seconds: number, message: string) => void;
}
export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
export class RoomConnection {
  private readonly connection;
  private disposed = false;
  constructor(baseUrl: string, username: string, private readonly hash: string, events: RoomEvents,
    private readonly onStatus: (status: ConnectionStatus) => void, private readonly onError: (error: unknown) => void) {
    this.connection = new HubConnectionBuilder()
      .withUrl(`${baseUrl}/hubs/room?username=${encodeURIComponent(username)}`)
      .withAutomaticReconnect().configureLogging({ log: (level, message) => {
        if (!this.disposed && level >= LogLevel.Warning) console.warn(`[SignalR] ${message}`);
      } }).build();
    for (const [name, handler] of Object.entries(events)) this.connection.on(name, (...args: unknown[]) => {
      if (!this.disposed) handler(...args);
    });
    this.connection.onreconnecting(() => { if (!this.disposed) onStatus('reconnecting'); });
    this.connection.onreconnected(async () => {
      if (this.disposed) return;
      try { await this.connection.invoke('JoinRoom', hash); onStatus('connected'); }
      catch (error) { onStatus('disconnected'); onError(error); }
    });
    this.connection.onclose(error => {
      if (!this.disposed) { onStatus('disconnected'); if (error) onError(error); }
    });
  }
  async start() {
    this.onStatus('connecting');
    await this.connection.start();
    if (this.disposed) { await this.connection.stop(); return; }
    await this.connection.invoke('JoinRoom', this.hash);
    if (!this.disposed) this.onStatus('connected');
  }
  get connected() { return this.connection.state === HubConnectionState.Connected && !this.disposed; }
  private async invoke(method: string, ...args: unknown[]) {
    if (!this.connected) throw new Error('A conexão com a sala foi interrompida. Aguarde a reconexão.');
    await this.connection.invoke(method, this.hash, ...args);
  }
  sendAction = (action: PlayerActionMessage) => this.invoke('SendPlayerAction', action);
  sendChat = (content: string) => this.invoke('SendChatMessage', content);
  addVideo = (video: AddVideo) => this.invoke('AddToPlaylist', video);
  sync = () => this.invoke('SyncState');
  jump = (index: number) => this.invoke('JumpToVideo', index);
  progress = (time: number, index: number) => this.invoke('ReportPlaybackProgress', time, index);
  async dispose() {
    if (this.disposed) return;
    this.disposed = true;
    try {
      if (this.connection.state === HubConnectionState.Connected) await this.connection.invoke('LeaveRoom', this.hash);
    } catch (error) { this.onError(error); }
    finally { await this.connection.stop(); }
  }
}
