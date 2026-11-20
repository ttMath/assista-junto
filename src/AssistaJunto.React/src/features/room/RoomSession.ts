import { Api } from '../../services/api';
import { getUsername } from '../../services/identity';
import { playChatAlert } from '../../services/notifications';
import { RoomConnection, type ConnectionStatus, type RoomEvents } from '../../services/realtime';
import { PlayerAction, type ChatMessage, type PlayerActionMessage, type PlaylistItem, type Room, type RoomState, type RoomUser, type Toast } from '../../types/contracts';
import type { PlayerPort } from '../player/YouTubePlayer';
import { ChatThrottle, mergeMessages } from './chat';
import { reorderPlaylist, sameOrder } from './playlist';

export interface SessionState extends RoomState {
  messages: ChatMessage[]; users: RoomUser[]; toasts: Toast[];
  connection: ConnectionStatus; volume: number; muted: boolean; notificationMuted: boolean;
  blockedSeconds: number; blockMessage: string; reordering: boolean; playerReady: boolean; chatActivity: number;
}
export type Transport = Pick<RoomConnection, 'start' | 'dispose' | 'connected' | 'sendAction' | 'sendChat' | 'sync' | 'jump' | 'progress'>;
export type ConnectionFactory = (events: RoomEvents, status: (status: ConnectionStatus) => void, error: (error: unknown) => void) => Transport;

export class RoomSession {
  private state: SessionState;
  private readonly listeners = new Set<() => void>();
  private readonly connection: Transport;
  private player?: PlayerPort;
  private playerReady = false;
  private loadedVideoId: string | null = null;
  private disposed = false;
  private lastRemoteAt = -Infinity;
  private readonly throttle = new ChatThrottle();
  private progressTimer?: ReturnType<typeof setInterval>;
  private blockTimer?: ReturnType<typeof setInterval>;
  private readonly toastTimers = new Set<ReturnType<typeof setTimeout>>();
  private toastId = 0;
  private progressPending = false;
  constructor(private readonly api: Api, readonly room: Room, initial?: RoomState, factory?: ConnectionFactory) {
    this.state = {
      ...(initial ?? { playlist: room.playlist, currentVideoIndex: room.currentVideoIndex, currentTime: room.currentTime,
        isPlaying: room.isPlaying, videoId: room.playlist[room.currentVideoIndex]?.videoId ?? null }),
      messages: [], users: [], toasts: [], connection: 'connecting', volume: 80, muted: false, notificationMuted: false,
      blockedSeconds: 0, blockMessage: '', reordering: false, playerReady: false, chatActivity: 0,
    };
    const events: RoomEvents = {
      ReceiveRoomState: state => this.receiveState(state),
      ReceivePlayerAction: action => { void this.receiveAction(action).catch(this.error); },
      ReceiveChatHistory: messages => this.patch({ messages: mergeMessages(this.state.messages, messages ?? []) }),
      ReceiveChatMessage: message => {
        if (this.state.messages.some(item => item.id === message.id)) return;
        const fromAnotherUser = message.userDisplayName.toLowerCase() !== getUsername()?.toLowerCase();
        this.patch({ messages: [...this.state.messages, message], chatActivity: this.state.chatActivity + (fromAnotherUser ? 1 : 0) });
        if (!this.state.notificationMuted && fromAnotherUser) {
          void playChatAlert().catch(() => { /* Audio is optional when autoplay is blocked. */ });
        }
      },
      PlaylistUpdated: item => this.receivePlaylistItem(item),
      PlaylistCleared: () => this.receiveState({ playlist: [], currentVideoIndex: 0, currentTime: 0, isPlaying: false, videoId: null }),
      UserJoined: user => this.toast(`${user.displayName} entrou na sala`),
      UserLeft: name => this.toast(`${name} saiu da sala`),
      ReceiveUserList: users => this.patch({ users }),
      ChatBlocked: (seconds, message) => { this.throttle.block(seconds, message); this.refreshBlock(); },
    };
    this.connection = factory ? factory(events, status => this.patch({ connection: status }), this.error)
      : new RoomConnection(api.baseUrl, getUsername() ?? 'Anônimo', room.hash, events, status => this.patch({ connection: status }), this.error);
  }
  snapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private patch(update: Partial<SessionState>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...update };
    this.listeners.forEach(listener => listener());
  }
  error = (error: unknown) => { this.toast(error instanceof Error ? error.message : 'Não foi possível concluir a operação.'); };
  async start() {
    try {
      await this.connection.start();
      if (this.disposed) return;
      this.progressTimer = setInterval(() => { void this.reportProgress().catch(this.error); }, 3000);
    } catch (error) { if (!this.disposed) { this.patch({ connection: 'disconnected' }); this.error(error); } }
  }
  attachPlayer(player: PlayerPort) { this.player = player; this.playerReady = false; this.patch({ playerReady: false }); }
  ready = () => {
    if (this.disposed) return;
    this.playerReady = true;
    this.patch({ playerReady: true });
    this.loadedVideoId = null;
    this.lastRemoteAt = Date.now();
    this.player?.volume(this.state.volume);
    this.player?.mute(this.state.muted);
    this.applyPlayerState(this.state);
  };
  private applyPlayerState(state: RoomState) {
    if (!this.playerReady || !this.player) return;
    if (!state.videoId) {
      this.player.stop(); this.loadedVideoId = null; return;
    }
    if (this.loadedVideoId !== state.videoId) {
      this.loadedVideoId = state.videoId;
      this.player.load(state.videoId, Math.max(0, state.currentTime), state.isPlaying);
    } else {
      // A zero in a playlist-only broadcast must not reset the current video.
      if (state.currentTime > 0) this.player.seek(state.currentTime);
      if (state.isPlaying) this.player.play(); else this.player.pause();
    }
  }
  private receiveState(state: RoomState) {
    if (this.disposed) return;
    this.lastRemoteAt = Date.now();
    this.patch(state);
    this.applyPlayerState(state);
  }
  private async receiveAction(action: PlayerActionMessage) {
    if (this.disposed) return;
    this.lastRemoteAt = Date.now();
    if (action.action === PlayerAction.NextVideo || action.action === PlayerAction.PreviousVideo) { await this.connection.sync(); return; }
    if (action.action === PlayerAction.ChangeVideo) return; // Existing hub has no implementation for this enum member.
    if (action.seekTime !== null) {
      this.patch({ currentTime: action.seekTime });
      this.player?.seek(action.seekTime);
    }
    if (action.action === PlayerAction.Play) { this.patch({ isPlaying: true }); this.player?.play(); }
    if (action.action === PlayerAction.Pause) { this.patch({ isPlaying: false }); this.player?.pause(); }
  }
  onPlayerState = (state: number) => { void this.handlePlayerState(state).catch(this.error); };
  private async handlePlayerState(state: number) {
    if (this.disposed) return;
    if (state === 0) {
      this.patch({ isPlaying: false });
      if (this.state.currentVideoIndex < this.state.playlist.length - 1) await this.next();
    } else if (state === 1 || state === 2) {
      this.patch({ isPlaying: state === 1 });
      if (Date.now() - this.lastRemoteAt >= 1500) {
        const time = this.player?.time() ?? 0;
        this.patch({ currentTime: time });
        await this.sendAction(state === 1 ? PlayerAction.Play : PlayerAction.Pause, time);
      }
    }
  }
  onPlayerSeek = (time: number) => {
    if (this.disposed) return;
    this.patch({ currentTime: time });
    if (Date.now() - this.lastRemoteAt >= 1500) void this.sendAction(PlayerAction.SeekTo, time).catch(this.error);
  };
  private sendAction(action: PlayerActionMessage['action'], seekTime: number | null = null) {
    return this.connection.sendAction({ action, seekTime, videoId: null, expectedIndex: this.state.currentVideoIndex });
  }
  play = () => {
    if (this.playerReady && this.state.currentTime > 0 && Math.abs((this.player?.time() ?? 0) - this.state.currentTime) > 1.5) this.player?.seek(this.state.currentTime);
    this.player?.play();
  };
  pause = () => { this.player?.pause(); };
  playback = () => ({ time: this.playerReady ? this.player?.time() ?? 0 : 0, duration: this.playerReady ? this.player?.duration() ?? 0 : 0 });
  seekTo = async (time: number) => {
    if (!this.playerReady || !this.connection.connected || !Number.isFinite(time)) return;
    const duration = this.player?.duration() ?? 0;
    if (duration <= 0) return;
    const target = Math.max(0, Math.min(time, duration));
    this.player?.seek(target);
    this.patch({ currentTime: target });
    await this.sendAction(PlayerAction.SeekTo, target);
  };
  next = async () => { await this.sendAction(PlayerAction.NextVideo); await this.connection.sync(); };
  previous = async () => { await this.sendAction(PlayerAction.PreviousVideo); await this.connection.sync(); };
  jump = async (index: number) => { if (index !== this.state.currentVideoIndex) await this.connection.jump(index); };
  setVolume = (volume: number) => { this.patch({ volume }); this.player?.volume(volume); };
  toggleMute = () => { this.patch({ muted: !this.state.muted }); this.player?.mute(this.state.muted); };
  toggleNotifications = () => this.patch({ notificationMuted: !this.state.notificationMuted });
  private async reportProgress() {
    if (!this.playerReady || !this.state.isPlaying || !this.connection.connected || this.progressPending) return;
    this.progressPending = true;
    try {
      const time = this.player?.time() ?? 0;
      this.patch({ currentTime: time });
      await this.connection.progress(time, this.state.currentVideoIndex);
    } finally { this.progressPending = false; }
  }
  async sendChat(message: string) {
    if (!message.trim() || !this.throttle.allow()) { this.refreshBlock(); return; }
    await this.connection.sendChat(message);
  }
  private refreshBlock() {
    clearInterval(this.blockTimer);
    const tick = () => {
      const blockedSeconds = this.throttle.remaining();
      this.patch({ blockedSeconds, blockMessage: blockedSeconds ? this.throttle.message : '' });
      if (!blockedSeconds) clearInterval(this.blockTimer);
    };
    tick();
    if (this.throttle.remaining()) this.blockTimer = setInterval(tick, 1000);
  }
  private receivePlaylistItem(item: PlaylistItem) {
    if (this.state.playlist.some(existing => existing.id === item.id)) return;
    const wasEmpty = this.state.playlist.length === 0;
    this.patch({ playlist: [...this.state.playlist, item] });
    if (wasEmpty) this.receiveState({ ...this.state, currentVideoIndex: 0, videoId: item.videoId, currentTime: 0, isPlaying: true });
  }
  async reorder(id: string, target: number) {
    if (this.state.reordering) return;
    const previous = this.state;
    const result = reorderPlaylist(previous.playlist, previous.currentVideoIndex, id, target);
    if (sameOrder(result.playlist, previous.playlist)) return;
    this.patch({ playlist: result.playlist, currentVideoIndex: result.currentIndex, reordering: true });
    try { await this.api.reorder(this.room.hash, id, target); }
    catch (error) {
      if (sameOrder(this.state.playlist, result.playlist)) this.patch({ playlist: previous.playlist, currentVideoIndex: previous.currentVideoIndex });
      this.error(error);
    } finally { this.patch({ reordering: false }); }
  }
  toast = (message: string) => {
    if (this.disposed) return;
    const id = ++this.toastId;
    this.patch({ toasts: [...this.state.toasts, { id, message }] });
    const timer = setTimeout(() => { this.toastTimers.delete(timer); this.dismissToast(id); }, 4000);
    this.toastTimers.add(timer);
  };
  dismissToast = (id: number) => this.patch({ toasts: this.state.toasts.filter(toast => toast.id !== id) });
  async dispose() {
    if (this.disposed) return;
    this.disposed = true;
    clearInterval(this.progressTimer); clearInterval(this.blockTimer);
    this.toastTimers.forEach(clearTimeout); this.toastTimers.clear();
    this.listeners.clear(); this.player?.destroy();
    await this.connection.dispose();
  }
}
