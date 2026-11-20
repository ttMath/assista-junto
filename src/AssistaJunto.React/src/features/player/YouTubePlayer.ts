export interface PlayerCallbacks {
  ready: () => void;
  state: (state: number) => void;
  seek: (time: number) => void;
  error: (message: string) => void;
}
export interface PlayerPort {
  load(videoId: string, time: number, playing: boolean): void;
  play(): void; pause(): void; stop(): void; seek(time: number): void;
  time(): number; duration(): number; volume(value: number): void; mute(value: boolean): void; destroy(): void;
}
interface YTInstance {
  loadVideoById(video: { videoId: string; startSeconds: number }): void;
  cueVideoById(video: { videoId: string; startSeconds: number }): void;
  playVideo(): void; pauseVideo(): void; stopVideo(): void; seekTo(time: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number; getDuration(): number; setVolume(value: number): void; mute(): void; unMute(): void; destroy(): void;
}
interface YTApi {
  Player: new (element: HTMLElement, options: {
    width: string; height: string; playerVars: Record<string, string | number>;
    events: { onReady: () => void; onStateChange: (event: { data: number }) => void; onError: (event: { data: number }) => void };
  }) => YTInstance;
}
declare global { interface Window { YT?: YTApi; onYouTubeIframeAPIReady?: () => void } }
let apiPromise: Promise<YTApi> | undefined;
function loadApi(): Promise<YTApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise<YTApi>((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      const timer = window.setTimeout(() => reject(new Error('Não foi possível carregar o player do YouTube. Recarregue a página.')), 20_000);
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        if (window.YT?.Player) { clearTimeout(timer); resolve(window.YT); }
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => { clearTimeout(timer); reject(new Error('Não foi possível carregar o player do YouTube.')); };
      document.head.append(script);
    }).catch(error => { apiPromise = undefined; throw error; });
  }
  return apiPromise;
}

// Port of wwwroot/js/youtube-player.js, with one owned instance per mounted room.
export class YouTubePlayer implements PlayerPort {
  private player?: YTInstance;
  private ready = false;
  private disposed = false;
  private tracker?: number;
  private lastTime = 0;
  private lastState = -1;
  constructor(element: HTMLElement, private readonly callbacks: PlayerCallbacks) {
    void loadApi().then(api => {
      if (this.disposed) return;
      this.player = new api.Player(element, {
        width: '100%', height: '100%',
        playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1, playsinline: 1, origin: window.location.origin },
        events: {
          onReady: () => { if (!this.disposed) { this.ready = true; callbacks.ready(); } },
          onStateChange: event => { if (!this.disposed) this.onState(event.data); },
          onError: event => { if (!this.disposed) callbacks.error(`Erro no player YouTube (${event.data}). Verifique se o vídeo permite reprodução incorporada.`); },
        },
      });
    }).catch(error => { if (!this.disposed) callbacks.error(error instanceof Error ? error.message : 'Falha no player.'); });
  }
  private onState(state: number) {
    const time = this.time();
    if (state === 3 && this.lastState === 1 && Math.abs(time - this.lastTime) > 2 && this.lastTime > 0) this.callbacks.seek(time);
    this.stopTracker();
    if (state === 1) {
      this.lastTime = time;
      this.tracker = window.setInterval(() => { this.lastTime = this.time(); }, 1000);
    } else if (state === 2) this.lastTime = time;
    this.lastState = state;
    this.callbacks.state(state);
  }
  private stopTracker() { clearInterval(this.tracker); this.tracker = undefined; }
  load(videoId: string, time: number, playing: boolean) {
    if (!this.ready || !videoId) return;
    this.lastTime = time;
    const video = { videoId, startSeconds: Math.max(0, time) };
    if (playing) this.player?.loadVideoById(video); else this.player?.cueVideoById(video);
  }
  play() { if (this.ready) this.player?.playVideo(); }
  pause() { if (this.ready) this.player?.pauseVideo(); }
  stop() { if (this.ready) this.player?.stopVideo(); }
  seek(time: number) { if (this.ready) { this.lastTime = time; this.player?.seekTo(time, true); } }
  time() { return this.ready ? this.player?.getCurrentTime() ?? 0 : 0; }
  duration() { return this.ready ? this.player?.getDuration() ?? 0 : 0; }
  volume(value: number) { if (this.ready) this.player?.setVolume(value); }
  mute(value: boolean) { if (this.ready) { if (value) this.player?.mute(); else this.player?.unMute(); } }
  destroy() { this.disposed = true; this.stopTracker(); this.player?.destroy(); this.player = undefined; this.ready = false; }
}
