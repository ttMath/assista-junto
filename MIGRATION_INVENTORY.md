# Inventário da migração AssistaJunto

Auditoria inicial: 16/11/2026. Fonte da verdade: código do repositório. O Blazor será preservado permanentemente; o React ficará em `src/AssistaJunto.React`.

Status: implementações React realizadas. O escopo e os limites da validação estão em `MIGRATION_VALIDATION.md`; implementado não significa que itens pendentes de infraestrutura já foram validados.

| Funcionalidade | Implementação Blazor | Dependências | Implementação React | Status |
|---|---|---|---|---|
| Entrada por nome, Enter, trim, limite de 50 caracteres | `Pages/Home.razor`, `Components/NamePromptModal.razor`, `Services/AuthStateService.cs` | localStorage `user_name` | `services/identity.ts`, `pages/Home.tsx`, `components/Modals.tsx` | Implementado; ver validação |
| Edição do nome, Enter/Escape, logout | `Layout/MainLayout.razor` | AuthStateService; recarga ao sair | `components/Layout.tsx` | Implementado; ver validação |
| Layout, marca, créditos, responsividade e animações | `Layout/`, `Pages/*.razor.css`, `wwwroot/css/app.css` | Bootstrap local, imagens e SVG | `styles/`, `public/`, `components/Layout.tsx` | Implementado; ver validação |
| Criação automática do modal, sala e senha opcional; conflitos e limite de salas | `Pages/Home.razor`, `Components/CreateRoomModal.razor` | POST `api/rooms`, `X-Username` percent-encoded | `pages/Home.tsx`, `services/api.ts` | Implementado; ver validação |
| Rotas `/`, `/sala/{hash}`, `/not-found` e desconhecidas | `App.razor`, `Pages/NotFound.razor` | fallback SPA; metadados SEO | `app/App.tsx`, `components/Metadata.tsx` | Implementado; ver validação |
| Acesso direto, pedido de nome, sala privada, bypass do proprietário | `Pages/RoomPage.razor`, `Components/PasswordModal.razor` | GET sala, POST join; comparação case-insensitive do dono | `pages/Room.tsx`, `features/room/RoomSession.ts` | Implementado; ver validação |
| Conexão, eventos, saída, reconexão | `Services/RoomHubService.cs`, `Pages/RoomPage.razor` | `/hubs/room?username=...`, dez eventos, métodos do hub | `services/realtime.ts`, `features/room/RoomSession.ts` | Implementado; ver validação |
| YouTube: load/cue, play/pause, seek, fim automático, anterior/próximo, salto | `wwwroot/js/youtube-player.js`, `Pages/RoomPage.razor` | YouTube IFrame API, ações numéricas 0–5, ExpectedIndex | `features/player/YouTubePlayer.ts`, `features/room/RoomSession.ts` | Implementado; ver validação |
| Cooldown remoto 1500 ms, detecção de seek >2 s, progresso a cada 3 s | `Pages/RoomPage.razor`, `wwwroot/js/youtube-player.js` | SendPlayerAction, SyncState, ReportPlaybackProgress | `features/player/YouTubePlayer.ts`, `features/room/RoomSession.ts` | Implementado; ver validação |
| Volume inicial 80, slider, mute local | `Components/VideoControls.razor` | Player JS; não transmite volume | `components/VideoControls.tsx` | Implementado; ver validação |
| Adição por URL, vídeo/playlist; fim/após atual/ver agora; shuffle na adição | `Pages/RoomPage.razor` | POST playlist/from-url, InsertMode numérico 0/1/2, YoutubeExplode no backend | `components/Playlist.tsx`, `services/api.ts` | Implementado; vídeo real e payloads validados; playlist externa pendente |
| Playlist: selecionar, remover, limpar, embaralhar próximos | `Pages/RoomPage.razor` | JumpToVideo; DELETE e POST playlist; broadcasts | `components/Playlist.tsx`, `features/room/RoomSession.ts` | Implementado; ver validação |
| Drag-and-drop otimista, preservar item corrente, rollback condicional, ignorar clique após drop | `Pages/RoomPage.razor` | POST playlist/reorder; cooldown 250 ms | `components/Playlist.tsx`, `features/room/playlist.ts` | Implementado; ver validação |
| Chat: histórico de 200, merge por ID/data, Enter, scroll automático, evitar envio duplo | `Components/ChatRoom.razor`, `Pages/RoomPage.razor` | ReceiveChatHistory, ReceiveChatMessage, SendChatMessage | `components/Chat.tsx`, `features/room/RoomSession.ts` | Implementado; ver validação |
| Antispam local e remoto: 3 mensagens/20 s, bloqueio 60 s, countdown | `Pages/RoomPage.razor` | ChatBlocked no hub | `features/room/chat.ts`, `components/Chat.tsx` | Implementado; ver validação |
| Som de novas mensagens, apenas outros autores, toggle local | `Components/SoundToggleButton.razor`, `wwwroot/js/chat-notifications.js` | Web Audio, SVG sound-on/off | `services/notifications.ts`, `components/Chat.tsx` | Implementado; ver validação |
| Abas Chat/Usuários, contador, proprietário, avatar determinístico | `Components/UserList.razor`, `Components/UserAvatar.razor` | ReceiveUserList; soma UTF-16 para paleta | `components/Users.tsx` | Implementado; ver validação |
| Toasts de entrada/saída/erros (4 s), copiar URL | `Pages/RoomPage.razor` | clipboard; UserJoined/UserLeft | `components/Toasts.tsx`, `pages/Room.tsx` | Implementado; ver validação |
| Serviços auxiliares: listar/excluir salas, GET/POST playlist | `Services/ApiService.cs` | Todos os endpoints existentes | `services/api.ts` | Implementado; ver validação |
| Docker, ambiente, publicação independente, seleção e rollback | `client.Dockerfile`, `docker/`, compose e solution | API_BASE_URL, CORS; nginx | Dockerfile React e compose adicional | Preparado; execução Docker pendente |

## Contratos e limites encontrados

- Solução .NET 10: API, Application, Domain, Infrastructure, Client Blazor e Pipoca.Bot. Não havia projeto de testes automatizados.
- Identidade é apelido, não autenticação externa. Não criar JWT, OAuth, sessão de servidor ou permissões novas.
- JSON usa camelCase, GUID em string, datas ISO UTC, enums numéricos, campos nullable explícitos. `PlayerAction.ChangeVideo = 3` existe no contrato, mas não possui tratamento no hub/página; preservar o contrato sem inventar comportamento.
- REST lista e exclui salas, mas a Home atual só cria salas. Exclusão por nome/listagem aparecem também no bot; não acrescentar telas ausentes à migração.
- `NavMenu.razor` está vazio; sample-data/weather.json e resolvePlaylist JS não são usados pelos fluxos atuais. Preservados no Blazor; não representam telas de produto a recriar.
- Reorder/remove/shuffle/from-url enviam ReceiveRoomState com CurrentTime=0. Zero nesses broadcasts não deve reiniciar o vídeo já carregado.
- O hub faz broadcast de ações aos outros clientes, não ao emissor; próximo/anterior precisam solicitar SyncState. Volume e mute são locais.
- O Blazor configura reconexão automática, mas não reinscreve explicitamente o grupo após reconectar. React deverá reinscrever o grupo e recuperar estado/histórico com os métodos existentes.
- RoomHub valida nome por conexão; a edição do nome no Blazor não recria a conexão existente. Registrar qualquer ajuste no React.
- API inicia `Database.Migrate()` e serviço de exclusão de salas inativas. Não iniciar a API usando o banco configurado durante validações desta migração.
- Backend, entidades, migrations, regras de senha, integrações YouTube e bot devem permanecer intactos.
- Existem alterações locais prévias em `.vscode/launch.json` e `.vscode/settings.json`; preservar.

## Critérios de equivalência

Validar tipos, lint, build, regras de sincronização/playlist/chat, componentes, navegação desktop/mobile e contratos HTTP/SignalR. Depois validar Blazor e React entre múltiplos clientes reais, reprodução YouTube e regressão visual. Build isolado não encerra a migração.

