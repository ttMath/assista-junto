import { test, expect, type WebSocketRoute } from '@playwright/test';
import { openRoom, playerState, seed } from './helpers';

test('reconnect restores group membership, playback, chat and presence without duplicates', async ({ page, request, browser }) => {
  const sockets: WebSocketRoute[] = [];
  await page.routeWebSocket(/\/hubs\/room\?/, socket => { sockets.push(socket); socket.connectToServer(); });
  const room = await seed(request); const friend = await browser.newPage();
  try {
    await openRoom(page, room.hash, room.ownerDisplayName); await openRoom(friend, room.hash, `Amigo ${Date.now()}`);
    await expect.poll(() => sockets.length).toBeGreaterThanOrEqual(1);
    const socketCount = sockets.length; sockets.at(-1)!.close({ code: 1012, reason: 'Reconnect test' });
    await expect.poll(() => sockets.length).toBeGreaterThan(socketCount);
    await expect(page.getByText('Reconectando com a sala...', { exact: true })).toHaveCount(0);
    await friend.getByRole('tab', { name: 'Chat', exact: true }).click();
    await page.getByRole('tab', { name: 'Chat', exact: true }).click();
    await friend.getByPlaceholder('Digite uma mensagem...').fill('Depois da reconexão'); await friend.getByPlaceholder('Digite uma mensagem...').press('Enter');
    await expect(page.getByText('Depois da reconexão', { exact: true })).toHaveCount(1);
    await friend.getByTitle('Próximo', { exact: true }).click(); await expect.poll(async () => (await playerState(page))?.video).toBe('aqz-KE-bpKQ');
    await page.getByRole('tab', { name: 'Pessoas', exact: true }).click(); await expect(page.getByText('2 online', { exact: true })).toBeVisible();
  } finally { await friend.close(); }
});

test('drag reorder preserves the current item and local controls do not change the other player', async ({ page, browser, request }) => {
  const room = await seed(request); const friend = await browser.newPage();
  try {
    await openRoom(page, room.hash, room.ownerDisplayName); await openRoom(friend, room.hash, `Amigo ${Date.now()}`);
    const data = await page.evaluateHandle(() => new DataTransfer());
    const source = page.getByRole('button', { name: 'Arrastar Vídeo de demonstração para reordenar' });
    await source.dispatchEvent('dragstart', { dataTransfer: data });
    await page.locator('.playlist-item[data-index="2"]').dispatchEvent('dragover', { dataTransfer: data });
    await page.locator('.playlist-item[data-index="2"]').dispatchEvent('drop', { dataTransfer: data });
    await expect(friend.locator('.queue-current')).toContainText('Vídeo de demonstração');
    await expect.poll(async () => {
      const response = await request.get(`http://127.0.0.1:5199/api/rooms/${room.hash}`);
      return (await response.json()).currentVideoIndex;
    }).toBe(2);
    await expect.poll(async () => (await playerState(friend))?.video).toBe('M7lc1UVf-VE');
    await page.getByLabel('Volume', { exact: true }).fill('25'); await page.getByTitle('Silenciar vídeo', { exact: true }).click();
    await expect(friend.getByLabel('Volume', { exact: true })).toHaveValue('80'); await expect(friend.getByTitle('Silenciar vídeo', { exact: true })).toBeVisible();
    await page.getByTitle('Clique para alterar o nome').click();
    await page.getByLabel('Editar nome').fill('Nome alterado'); await page.getByLabel('Editar nome').press('Enter');
    await expect(page.getByLabel('Volume', { exact: true })).toHaveValue('25');
    await expect(page.getByTitle('Ativar som do vídeo', { exact: true })).toBeVisible();
  } finally { await friend.close(); }
});
