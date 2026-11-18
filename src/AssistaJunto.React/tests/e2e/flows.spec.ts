import { test, expect } from '@playwright/test';
import { identify, installPlayer, openRoom, playerState, seed } from './helpers';

test('name entry, create room, edit name and leave confirmation', async ({ page }) => {
  await installPlayer(page); await page.goto('/');
  await page.getByPlaceholder('Digite seu nome...').fill(`Pessoa ${Date.now()}`);
  await page.getByPlaceholder('Digite seu nome...').press('Enter');
  await page.getByLabel('Nome da Sala').fill('Noite de Cinema');
  await page.getByRole('button', { name: 'CRIAR SALA', exact: true }).click();
  await expect(page).toHaveURL(/\/sala\//); await expect(page.getByText('SALA ATIVA', { exact: true })).toBeVisible();
  await page.getByTitle('Clique para alterar o nome').click(); await page.getByLabel('Editar nome').fill('Novo nome'); await page.getByLabel('Editar nome').press('Enter');
  await expect(page.getByTitle('Clique para alterar o nome')).toContainText('Novo nome');
  await page.getByRole('button', { name: '🎬 Assista Junto' }).click();
  await expect(page.getByRole('dialog', { name: 'Sair da sala' })).toBeVisible(); await page.getByRole('button', { name: 'Não', exact: true }).click();
  await expect(page).toHaveURL(/\/sala\//); await page.getByRole('button', { name: '🎬 Assista Junto' }).click(); await page.getByRole('button', { name: 'Sim', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
  await expect(page.getByRole('dialog', { name: 'Nova Sala', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: '🎬 Assista Junto' }).click();
  await expect(page.getByRole('dialog', { name: 'Nova Sala', exact: true })).toBeVisible();
});

test('direct private room requires name and password, owner bypasses password', async ({ page, request, browser }) => {
  const room = await seed(request, `Host ${Date.now()}`, 'secreta'); await installPlayer(page); await page.goto(`/sala/${room.hash}`);
  await page.getByPlaceholder('Seu nome...').fill(`Visitante ${Date.now()}`); await page.getByPlaceholder('Seu nome...').press('Enter');
  await expect(page.getByRole('dialog', { name: 'Sala Privada' })).toBeVisible();
  await page.getByLabel('Palavra-passe').fill('errada'); await page.getByRole('button', { name: 'ACESSAR', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Senha incorreta.');
  await page.getByLabel('Palavra-passe').fill('secreta'); await page.getByRole('button', { name: 'ACESSAR', exact: true }).click();
  await expect(page.getByText('SALA ATIVA', { exact: true })).toBeVisible();
  const owner = await browser.newPage(); try { await openRoom(owner, room.hash, room.ownerDisplayName.toUpperCase()); await expect(owner.getByRole('dialog')).toHaveCount(0); } finally { await owner.close(); }
});

test('real SignalR synchronizes two clients, chat history, player actions and playlist', async ({ page, request, browser }) => {
  const room = await seed(request); const second = await browser.newPage();
  try {
    await openRoom(page, room.hash, room.ownerDisplayName); await openRoom(second, room.hash, `Amigo ${Date.now()}`);
    await page.getByRole('tab', { name: /Usuários/ }).click(); await expect(page.getByText('2 online', { exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'Chat', exact: true }).click();
    await page.getByLabel('Mensagem', { exact: true }).fill('Olá comunidade'); await page.getByLabel('Mensagem', { exact: true }).press('Enter');
    await expect(second.getByText('Olá comunidade', { exact: true })).toBeVisible();
    await second.reload(); await expect(second.getByText('Olá comunidade', { exact: true })).toBeVisible();
    // Let the original 1500ms remote-event cooldown expire before an intentional local play.
    await expect.poll(async () => (await playerState(page))?.video).toBe('M7lc1UVf-VE');
    await page.waitForTimeout(1600); await page.getByTitle('Reproduzir', { exact: true }).click();
    await expect.poll(async () => (await playerState(second))?.playing).toBe(true);
    await page.getByTitle('Próximo', { exact: true }).click();
    await expect.poll(async () => (await playerState(second))?.video).toBe('aqz-KE-bpKQ');
    await expect.poll(async () => (await playerState(page))?.video).toBe('aqz-KE-bpKQ');
    await page.getByRole('button', { name: 'Remover Terceiro vídeo' }).click();
    await expect(second.getByText('Playlist (2 vídeos)', { exact: true })).toBeVisible();
    await page.getByTitle('Limpar playlist').click(); await expect(second.getByText('Playlist (0 vídeos)', { exact: true })).toBeVisible();
    await expect.poll(async () => (await playerState(second))?.video).toBeNull();
  } finally { await second.close(); }
});

test('chat spam countdown, notification toggle and logout', async ({ page, request }) => {
  const room = await seed(request); await openRoom(page, room.hash, room.ownerDisplayName);
  await page.getByTitle('Silenciar som de novas mensagens').click(); await expect(page.getByText('Silenciado', { exact: true })).toBeVisible();
  for (let i = 0; i < 4; i++) {
    await page.getByLabel('Mensagem', { exact: true }).fill(`Mensagem ${i}`); await page.getByLabel('Mensagem', { exact: true }).press('Enter');
  }
  await expect(page.getByRole('alert')).toContainText('Muitas mensagens seguidas'); await expect(page.getByLabel('Mensagem', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Sair', exact: true }).click(); await expect(page.getByPlaceholder('Digite seu nome...')).toBeVisible();
});

test('routes handle missing rooms and unknown pages', async ({ page }) => {
  await identify(page, 'Viajante'); await page.goto('/sala/inexistente'); await expect(page).toHaveURL('http://127.0.0.1:5173/');
  await page.goto('/not-found'); await expect(page.getByText('Not Found', { exact: true })).toBeVisible();
  await page.goto('/rota-desconhecida'); await expect(page.getByText('Not Found', { exact: true })).toBeVisible();
});

test('URL insertion controls preserve all numeric modes, shuffle and import errors', async ({ page, request }) => {
  const room = await seed(request); await openRoom(page, room.hash, room.ownerDisplayName);
  const bodies: unknown[] = [];
  await page.route('**/api/rooms/*/playlist/from-url', async route => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({ contentType: 'application/json', body: '{"items":[],"totalAdded":0}' });
  });
  await page.getByRole('button', { name: /^Shuffle na adição/ }).click();
  for (const [name, mode] of [['+ Fila', 0], ['Após atual', 1], ['Ver agora', 2]] as const) {
    await page.getByLabel('Link do YouTube ou playlist').fill(' https://youtu.be/example ');
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.getByLabel('Link do YouTube ou playlist')).toHaveValue('');
    expect(bodies.at(-1)).toEqual({ url: 'https://youtu.be/example', shuffle: true, insertMode: mode });
  }
  await page.unroute('**/api/rooms/*/playlist/from-url');
  await page.route('**/api/rooms/*/playlist/from-url', route => route.fulfill({ status: 400, contentType: 'application/json', body: '{"message":"URL inválida"}' }));
  await page.getByLabel('Link do YouTube ou playlist').fill('link-invalido'); await page.getByRole('button', { name: '+ Fila', exact: true }).click();
  await expect(page.getByText('Não foi possível adicionar o vídeo. Verifique o link e tente novamente.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Link do YouTube ou playlist')).toHaveValue('link-invalido');
});

test('copy room URL preserves the full origin and route', async ({ page, context, request }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const room = await seed(request); await openRoom(page, room.hash, room.ownerDisplayName);
  await page.getByTitle('Copiar URL da sala').click(); await expect(page.getByText('URL da sala copiada.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`http://127.0.0.1:5173/sala/${room.hash}`);
});
