import { expect, type APIRequestContext, type Page } from '@playwright/test';
import type { Room } from '../../src/types/contracts';

export async function seed(request: APIRequestContext, owner = `Dono ${Date.now()}`, password: string | null = null) {
  const response = await request.post('http://127.0.0.1:5199/__test/seed', { data: { name: `Cinema ${Date.now()}`, owner, password } });
  expect(response.ok()).toBeTruthy(); return await response.json() as Room;
}
// Deterministic IFrame API double, isolated to tests; HTTP and SignalR are real.
export async function installPlayer(page: Page) {
  await page.route('https://www.youtube.com/iframe_api', route => route.fulfill({ contentType: 'application/javascript', body: `
    window.__players = [];
    window.YT = { Player: class {
      constructor(element, options) { this.options = options; this.position = 0; this.playing = false; this.element = element; window.__players.push(this); queueMicrotask(() => options.events.onReady()); }
      loadVideoById(video) { this.video = typeof video === 'string' ? video : video.videoId; this.position = typeof video === 'string' ? 0 : video.startSeconds; this.playVideo(); }
      cueVideoById(video) { this.video = typeof video === 'string' ? video : video.videoId; this.position = typeof video === 'string' ? 0 : video.startSeconds; }
      playVideo() { if (!this.playing) { this.playing = true; this.options.events.onStateChange({ data: 1 }); } }
      pauseVideo() { if (this.playing) { this.playing = false; this.options.events.onStateChange({ data: 2 }); } }
      stopVideo() { this.playing = false; this.video = null; }
      seekTo(time) { this.position = time; }
      getCurrentTime() { return this.position; }
      setVolume(volume) { this.volume = volume; }
      mute() { this.muted = true; } unMute() { this.muted = false; }
      destroy() { this.destroyed = true; }
    }}; window.onYouTubeIframeAPIReady?.();
  ` }));
}
export async function identify(page: Page, username: string) {
  await page.addInitScript(name => {
    if (!sessionStorage.getItem('__test_identity_initialized')) {
      localStorage.setItem('user_name', name);
      sessionStorage.setItem('__test_identity_initialized', 'true');
    }
  }, username);
}
export async function openRoom(page: Page, hash: string, username: string, base = 'http://127.0.0.1:5173') {
  await identify(page, username); await installPlayer(page); await page.goto(`${base}/sala/${hash}`);
  await expect(page.getByText('SALA ATIVA', { exact: true })).toBeVisible();
}
export async function playerState(page: Page) {
  return page.evaluate(() => {
    const players = (window as Window & { __players?: { video: string | null; position: number; playing: boolean; destroyed?: boolean }[] }).__players;
    const player = players?.filter(player => !player.destroyed).at(-1);
    return player ? { video: player.video, time: player.position, playing: player.playing } : null;
  });
}
