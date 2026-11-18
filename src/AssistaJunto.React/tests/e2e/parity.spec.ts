import { test, expect } from '@playwright/test';
import { identify, installPlayer, openRoom, playerState, seed } from './helpers';
import { compareVisual } from './visual';

test('Blazor and React exchange chat and playback on the unchanged hub', async ({ page, browser, request }) => {
  const room = await seed(request); const blazor = await browser.newPage();
  try {
    await openRoom(page, room.hash, room.ownerDisplayName);
    await openRoom(blazor, room.hash, `Blazor ${Date.now()}`, 'http://127.0.0.1:5199');
    await blazor.getByPlaceholder('Digite uma mensagem...').fill('Mensagem do Blazor');
    await blazor.getByPlaceholder('Digite uma mensagem...').press('Enter'); await expect(page.getByText('Mensagem do Blazor', { exact: true })).toBeVisible();
    await page.getByLabel('Mensagem', { exact: true }).fill('Mensagem do React'); await page.getByLabel('Mensagem', { exact: true }).press('Enter');
    await expect(blazor.getByText('Mensagem do React', { exact: true })).toBeVisible();
    await expect.poll(async () => (await playerState(blazor))?.video).toBe('M7lc1UVf-VE');
    await page.waitForTimeout(1600); await blazor.getByTitle('Reproduzir', { exact: true }).click();
    await expect.poll(async () => (await playerState(page))?.playing).toBe(true);
    await page.getByTitle('Próximo', { exact: true }).click();
    await expect.poll(async () => (await playerState(blazor))?.video).toBe('aqz-KE-bpKQ');
    await blazor.getByTitle('Limpar playlist').click(); await expect(page.getByText('Playlist (0 vídeos)', { exact: true })).toBeVisible();
  } finally { await blazor.close(); }
});

test('home matches the original colors, geometry and responsive layout', async ({ page, browser }, info) => {
  const blazor = await browser.newPage({ viewport: page.viewportSize()! });
  try {
    await page.goto('/'); await blazor.goto('http://127.0.0.1:5199');
    await expect(blazor.getByPlaceholder('Digite seu nome...')).toBeVisible(); await expect(page.getByPlaceholder('Digite seu nome...')).toBeVisible();
    for (const selector of ['.top-bar', '.hero-content-box', '.name-entry-input', '.name-entry-button', '.text-glow']) {
      const metrics = async (target: typeof page) => target.locator(selector).evaluate(element => {
        const box = element.getBoundingClientRect(); const style = getComputedStyle(element);
        return { width: box.width, height: box.height, x: box.x, y: box.y, color: style.color, fontSize: style.fontSize, background: style.backgroundImage };
      });
      const original = await metrics(blazor); const migrated = await metrics(page);
      expect(migrated.color, selector).toBe(original.color); expect(migrated.fontSize, selector).toBe(original.fontSize); expect(migrated.background, selector).toBe(original.background);
      for (const dimension of ['width', 'height', 'x', 'y'] as const) expect(Math.abs(migrated[dimension] - original[dimension]), `${selector} ${dimension}`).toBeLessThanOrEqual(2);
    }
    await compareVisual(blazor, page, 'home', info);
  } finally { await blazor.close(); }
});

test('room geometry and colors follow the original without horizontal overflow', async ({ page, browser, request }, info) => {
  const room = await seed(request, `Visual ${Date.now()}`); const blazor = await browser.newPage({ viewport: page.viewportSize()! });
  try {
    await identify(page, room.ownerDisplayName); await identify(blazor, room.ownerDisplayName);
    await installPlayer(page); await installPlayer(blazor);
    await page.goto(`/sala/${room.hash}`); await blazor.goto(`http://127.0.0.1:5199/sala/${room.hash}`);
    await expect(page.getByText('SALA ATIVA', { exact: true })).toBeVisible(); await expect(blazor.getByText('SALA ATIVA', { exact: true })).toBeVisible();
    // Ignore the transient join toast; compare component layout directly.
    for (const selector of ['.room-grid', '.player-stage', '.controls-pill', '.add-video-panel', '.playlist-panel', '.social-tabs', '.chat-wrapper']) {
      const metrics = async (target: typeof page) => target.locator(selector).evaluate(element => {
        const box = element.getBoundingClientRect(); const style = getComputedStyle(element);
        return { width: box.width, height: box.height, x: box.x, y: box.y, color: style.color, background: style.backgroundColor };
      });
      const original = await metrics(blazor); const migrated = await metrics(page);
      expect(migrated.color, selector).toBe(original.color); expect(migrated.background, selector).toBe(original.background);
      expect(Math.abs(migrated.width - original.width), `${selector} width`).toBeLessThanOrEqual(2);
      expect(Math.abs(migrated.height - original.height), `${selector} height`).toBeLessThanOrEqual(2);
      expect(Math.abs(migrated.x - original.x), `${selector} x`).toBeLessThanOrEqual(2);
      expect(Math.abs(migrated.y - original.y), `${selector} y`).toBeLessThanOrEqual(2);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    const originalOverflow = await blazor.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(Math.max(2, originalOverflow));
    await compareVisual(blazor, page, 'room', info);
  } finally { await blazor.close(); }
});
