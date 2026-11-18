import { test, expect } from '@playwright/test';
import { identify, seed } from './helpers';

test('real YouTube IFrame API loads and plays using the native video control', async ({ page, request }, info) => {
  test.skip(!process.env.RUN_YOUTUBE_LIVE || info.project.name !== 'desktop', 'Optional external-service verification: RUN_YOUTUBE_LIVE=1');
  test.setTimeout(60_000);
  const room = await seed(request); await identify(page, room.ownerDisplayName);
  await page.goto(`/sala/${room.hash}`);
  await expect(page.locator('iframe#yt-player')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTitle('Reproduzir', { exact: true })).toBeEnabled({ timeout: 30_000 });
  await expect(page.getByText('Erro no player YouTube', { exact: false })).toHaveCount(0);
  // An unmuted initial play can require activation inside the cross-origin iframe.
  await page.frameLocator('iframe#yt-player').getByRole('button', { name: 'Play video', exact: true }).click();
  await expect(page.locator('.room-status-pill')).toHaveText('Ao vivo', { timeout: 20_000 });
});

test('two real YouTube players play and pause together through SignalR', async ({ page, request, browser }, info) => {
  test.skip(!process.env.RUN_YOUTUBE_LIVE || info.project.name !== 'desktop', 'Optional external-service verification: RUN_YOUTUBE_LIVE=1');
  test.setTimeout(90_000);
  const room = await seed(request); const friend = await browser.newPage();
  try {
    for (const [target, name] of [[page, room.ownerDisplayName], [friend, `Amigo ${Date.now()}`]] as const) {
      await identify(target, name); await target.goto(`http://127.0.0.1:5173/sala/${room.hash}`);
      await expect(target.getByTitle('Reproduzir', { exact: true })).toBeEnabled({ timeout: 30_000 });
      await target.getByTitle('Silenciar vídeo', { exact: true }).click();
    }
    // Muting is a normal local user choice, and permits remote autoplay in browsers.
    await page.waitForTimeout(1600); await page.getByTitle('Reproduzir', { exact: true }).click();
    const currentTime = (target: typeof page) => target.frameLocator('iframe#yt-player').locator('video').evaluate(video => (video as HTMLVideoElement).currentTime);
    await expect.poll(() => currentTime(page), { timeout: 25_000 }).toBeGreaterThan(36);
    await expect.poll(() => currentTime(friend), { timeout: 25_000 }).toBeGreaterThan(36);
    expect(Math.abs(await currentTime(page) - await currentTime(friend))).toBeLessThan(3);
    await page.getByTitle('Pausar', { exact: true }).click();
    await expect.poll(() => friend.frameLocator('iframe#yt-player').locator('video').evaluate(video => (video as HTMLVideoElement).paused)).toBe(true);
    await expect(friend.locator('.room-status-pill')).toHaveText('Pausado');
  } finally { await friend.close(); }
});

test('real backend validates YouTube metadata and inserts a URL after the current video', async ({ request }, info) => {
  test.skip(!process.env.RUN_YOUTUBE_LIVE || info.project.name !== 'desktop', 'Optional external-service verification: RUN_YOUTUBE_LIVE=1');
  test.setTimeout(120_000);
  const room = await seed(request);
  const response = await request.post(`http://127.0.0.1:5199/api/rooms/${room.hash}/playlist/from-url`, {
    headers: { 'X-Username': encodeURIComponent(room.ownerDisplayName) },
    data: { url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', shuffle: false, insertMode: 1 }, timeout: 110_000,
  });
  expect(response.status(), await response.text()).toBe(200);
  const result = await response.json(); expect(result.totalAdded).toBe(1); expect(result.items[0].videoId).toBe('jNQXAC9IVRw');
  expect(result.items[0].title.length).toBeGreaterThan(0);
  const updated = await (await request.get(`http://127.0.0.1:5199/api/rooms/${room.hash}`)).json();
  expect(updated.playlist[1].videoId).toBe('jNQXAC9IVRw'); expect(updated.currentVideoIndex).toBe(0);
});
