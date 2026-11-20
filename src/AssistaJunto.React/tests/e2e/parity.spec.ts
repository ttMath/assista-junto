import { test, expect } from '@playwright/test';
import { openRoom, playerState, seed } from './helpers';

test('Blazor and redesigned React exchange chat and playback on the unchanged hub', async ({ page, browser, request }) => {
  const room = await seed(request); const blazor = await browser.newPage();
  try {
    await openRoom(page, room.hash, room.ownerDisplayName);
    await openRoom(blazor, room.hash, `Blazor ${Date.now()}`, 'http://127.0.0.1:5199');
    await page.getByRole('tab', { name: 'Chat', exact: true }).click();
    await blazor.getByPlaceholder('Digite uma mensagem...').fill('Mensagem do Blazor');
    await blazor.getByPlaceholder('Digite uma mensagem...').press('Enter'); await expect(page.getByText('Mensagem do Blazor', { exact: true })).toBeVisible();
    await page.getByLabel('Mensagem', { exact: true }).fill('Mensagem do React'); await page.getByLabel('Mensagem', { exact: true }).press('Enter');
    await expect(blazor.getByText('Mensagem do React', { exact: true })).toBeVisible();
    await expect.poll(async () => (await playerState(blazor))?.video).toBe('M7lc1UVf-VE');
    await page.waitForTimeout(1600); await blazor.getByTitle('Reproduzir', { exact: true }).click();
    await expect.poll(async () => (await playerState(page))?.playing).toBe(true);
    await page.getByTitle('Próximo', { exact: true }).click();
    await expect.poll(async () => (await playerState(blazor))?.video).toBe('aqz-KE-bpKQ');
    await blazor.getByTitle('Limpar playlist').click(); await page.getByRole('tab', { name: 'Fila', exact: true }).click();
    await expect(page.getByLabel('Playlist (0 vídeos)', { exact: true })).toBeVisible();
  } finally { await blazor.close(); }
});

test('cinematic Home is usable without horizontal overflow', async ({ page }, info) => {
  await page.goto('/'); await expect(page.getByPlaceholder('Digite seu nome...')).toBeVisible();
  expect(await page.locator('.welcome-description').evaluate(el => getComputedStyle(el).fontFamily)).toContain('Segoe UI');
  for (const width of [320, 375, 390, 430, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const input = await page.getByPlaceholder('Digite seu nome...').boundingBox();
    expect(input!.width).toBeGreaterThan(150);
    await expect(page.getByRole('button', { name: 'ENTRAR', exact: true })).toBeDisabled();
  }
  await page.setViewportSize({ width: info.project.name === 'mobile' ? 390 : 1440, height: 900 });
  await page.screenshot({ path: info.outputPath('cinematic-home.png'), fullPage: true, animations: 'disabled', scale: 'css' });
});

test('room responds at all target widths without remounting player or connection', async ({ page, request }, info) => {
  const room = await seed(request); await openRoom(page, room.hash, room.ownerDisplayName);
  await expect.poll(async () => (await playerState(page))?.video).toBe('M7lc1UVf-VE');
  const initialPlayers = await page.evaluate(() => (window as Window & { __players?: unknown[] }).__players?.length);
  let connections = 0; page.on('websocket', () => connections++);
  for (const width of [320, 375, 390, 430, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const video = await page.locator('.video-stage').boundingBox(); const side = await page.locator('.room-sidebar').boundingBox();
    expect(Math.abs(video!.width / video!.height - 16 / 9)).toBeLessThan(.02);
    if (width > 1024) {
      expect(video!.width / (video!.width + side!.width)).toBeGreaterThanOrEqual(.69);
      expect(side!.x).toBeGreaterThan(video!.x + video!.width);
    } else expect(side!.y).toBeGreaterThan(video!.y + video!.height);
    expect(await page.evaluate(() => (window as Window & { __players?: unknown[] }).__players?.length)).toBe(initialPlayers);
    expect((await playerState(page))?.video).toBe('M7lc1UVf-VE');
  }
  expect(connections).toBe(0);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => (window as Window & { __players?: unknown[] }).__players?.length)).toBe(initialPlayers);
  expect((await playerState(page))?.video).toBe('M7lc1UVf-VE');
  expect(connections).toBe(0);
  await page.setViewportSize({ width: info.project.name === 'mobile' ? 390 : 1440, height: 900 });
  await page.screenshot({ path: info.outputPath('cinematic-room-queue.png'), fullPage: true, animations: 'disabled', scale: 'css' });
  await page.getByRole('tab', { name: 'Chat', exact: true }).click();
  await page.screenshot({ path: info.outputPath('cinematic-room-chat.png'), fullPage: true, animations: 'disabled', scale: 'css' });
  await page.getByRole('tab', { name: 'Pessoas', exact: true }).click();
  await page.screenshot({ path: info.outputPath('cinematic-room-people.png'), fullPage: true, animations: 'disabled', scale: 'css' });
});
