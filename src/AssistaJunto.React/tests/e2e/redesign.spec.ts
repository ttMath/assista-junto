import { test, expect } from '@playwright/test';
import { openRoom, playerState, seed } from './helpers';

test('queue opens first and keyboard tabs preserve drafts, playback and the live session', async ({ page, request }) => {
  const room = await seed(request); await openRoom(page, room.hash, room.ownerDisplayName);
  const tabs = page.getByRole('tab'); await expect(tabs).toHaveCount(3);
  expect(await tabs.evaluateAll(elements => elements.map(element => element.getAttribute('aria-label')))).toEqual(['Fila', 'Chat', 'Pessoas']);
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
  await expect.poll(async () => (await playerState(page))?.video).toBe('M7lc1UVf-VE');
  const before = await page.evaluate(() => (window as Window & { __players?: unknown[] }).__players?.length);
  await tabs.nth(0).focus(); await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toBeFocused(); await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await page.getByLabel('Mensagem', { exact: true }).fill('Minha mensagem em rascunho');
  await tabs.nth(2).click(); await tabs.nth(1).click();
  await expect(page.getByLabel('Mensagem', { exact: true })).toHaveValue('Minha mensagem em rascunho');
  expect(await page.evaluate(() => (window as Window & { __players?: unknown[] }).__players?.length)).toBe(before);
  expect((await playerState(page))?.time).toBe(35);
  await page.reload(); await expect(page.getByRole('tab', { name: 'Chat', exact: true })).toHaveAttribute('aria-selected', 'true');
});

test('cinema and fullscreen preserve the player, volume and session', async ({ page, request }) => {
  const room = await seed(request); await openRoom(page, room.hash, room.ownerDisplayName);
  await expect.poll(async () => (await playerState(page))?.video).toBe('M7lc1UVf-VE');
  const before = await page.evaluate(() => (window as Window & { __players?: unknown[] }).__players?.length);
  await page.getByLabel('Volume', { exact: true }).fill('27');
  await page.getByTitle('Modo cinema', { exact: true }).click();
  await expect(page.locator('.room-sidebar')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Mostrar painel', exact: true })).toBeVisible();
  await page.getByTitle('Sair do modo cinema', { exact: true }).click();
  await expect(page.locator('.room-sidebar')).toBeVisible();
  await expect(page.getByLabel('Volume', { exact: true })).toHaveValue('27');
  expect(await page.evaluate(() => (window as Window & { __players?: unknown[] }).__players?.length)).toBe(before);
  expect((await playerState(page))?.time).toBe(35);
  if (await page.evaluate(() => document.fullscreenEnabled)) {
    await page.getByTitle('Tela cheia', { exact: true }).click();
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
    await page.getByTitle('Sair da tela cheia', { exact: true }).click();
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
    expect(await page.evaluate(() => (window as Window & { __players?: unknown[] }).__players?.length)).toBe(before);
  }
});

test('unread chat counts real messages, not history, and clears when opened', async ({ page, browser, request }) => {
  const room = await seed(request); const friend = await browser.newPage();
  try {
    await openRoom(page, room.hash, room.ownerDisplayName); await openRoom(friend, room.hash, `Amigo ${Date.now()}`);
    await friend.getByRole('tab', { name: 'Chat', exact: true }).click();
    await friend.getByLabel('Mensagem', { exact: true }).fill('Primeira mensagem real'); await friend.getByLabel('Mensagem', { exact: true }).press('Enter');
    await expect(page.getByTestId('chat-unread')).toHaveText('1');
    await page.reload(); await expect(page.getByRole('tab', { name: 'Fila', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('chat-unread')).toHaveCount(0);
    await friend.getByLabel('Mensagem', { exact: true }).fill('Segunda mensagem real'); await friend.getByLabel('Mensagem', { exact: true }).press('Enter');
    await expect(page.getByTestId('chat-unread')).toHaveText('1');
    await page.getByRole('tab', { name: 'Chat', exact: true }).click(); await expect(page.getByTestId('chat-unread')).toHaveCount(0);
    await expect(page.getByText('Primeira mensagem real', { exact: true })).toBeVisible(); await expect(page.getByText('Segunda mensagem real', { exact: true })).toBeVisible();
  } finally { await friend.close(); }
});

test('touch and keyboard reorder use the real endpoint and keep the playing item', async ({ page, request }) => {
  const room = await seed(request); await openRoom(page, room.hash, room.ownerDisplayName);
  await expect(page.getByRole('button', { name: 'Mover Vídeo de demonstração para cima', exact: true })).toBeDisabled();
  const up = page.getByRole('button', { name: 'Mover Big Buck Bunny para cima', exact: true });
  if (test.info().project.name === 'mobile') await up.tap(); else { await up.focus(); await up.press('Enter'); }
  await expect.poll(async () => (await (await request.get(`http://127.0.0.1:5199/api/rooms/${room.hash}`)).json()).currentVideoIndex).toBe(1);
  await expect(page.locator('.queue-current')).toContainText('Vídeo de demonstração');
  await page.getByText('Vídeos anteriores (1)', { exact: true }).click(); await expect(page.getByRole('button', { name: 'Reproduzir Big Buck Bunny', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reproduzir Big Buck Bunny', exact: true }).click();
  await expect.poll(async () => (await playerState(page))?.video).toBe('aqz-KE-bpKQ');
});

test('custom seek propagates the actual playback position to another client', async ({ page, request, browser }) => {
  const room = await seed(request); const friend = await browser.newPage();
  try {
    await openRoom(page, room.hash, room.ownerDisplayName); await openRoom(friend, room.hash, `Amigo ${Date.now()}`);
    const seek = page.getByLabel('Posição do vídeo', { exact: true }); await expect(seek).toBeEnabled();
    await seek.focus(); await seek.press('End');
    await expect.poll(async () => (await playerState(friend))?.time).toBe(360);
    await expect.poll(async () => (await (await request.get(`http://127.0.0.1:5199/api/rooms/${room.hash}`)).json()).currentTime).toBe(360);
  } finally { await friend.close(); }
});
