# Arquitetura da migração

## Coexistência permanente

`src/AssistaJunto.Client` continua sendo o frontend Blazor completo, com seu projeto na solução, Dockerfile, configurações e recursos originais. Nenhum arquivo desse projeto foi alterado pela migração. O frontend React vive em `src/AssistaJunto.React`, possui build próprio e não precisa compilar nem executar o Blazor.

O compose e pipeline originais continuam selecionando o Blazor para produção. O React é opt-in via compose adicional, porta própria e sem roteamento Traefik automático. Não foi realizado deploy.

## Organização

| Origem Blazor | React | Responsabilidade |
|---|---|---|
| App.razor, Program.cs | app/App.tsx, main.tsx | Rotas, inicialização, configuração, boundary de erros |
| MainLayout.razor | components/Layout.tsx | Cabeçalho, apelido, logout, confirmação de saída |
| Home.razor | pages/Home.tsx | Entrada por nome, criação de sala, conflitos |
| RoomPage.razor | pages/Room.tsx | Acesso, senha, ciclo de vida da sala e apresentação |
| Lógica de RoomPage | features/room/RoomSession.ts | Estado externo ao render, eventos, timers, player e mensagens |
| Models/*.cs | types/contracts.ts | DTOs e enums de comunicação |
| ApiService.cs | services/api.ts | Todos os endpoints REST existentes |
| AuthStateService.cs | services/identity.ts | `user_name`, trim, 50 unidades UTF-16, assinatura de mudanças |
| RoomHubService.cs | services/realtime.ts | Cliente SignalR oficial 10.x, grupos e reconexão |
| youtube-player.js | features/player/YouTubePlayer.ts | IFrame API tipada, callbacks, seek e descarte |
| chat-notifications.js | services/notifications.ts | Mesmo envelope, frequências e duração das notificações |
| Components/*.razor | components/*.tsx | Chat, playlist, usuários, controles, modais e toasts |
| CSS isolado dos componentes | styles/legacy/*.scss | Estilos preservados com escopo por componente |
| wwwroot/lib, icons, imagens | public/ | Cópias independentes dos recursos e Bootstrap existente |

React, TypeScript strict, Vite, React Router e Sass. Versões exatas no package.json e lockfile. `useSyncExternalStore` assina identidade e estado da sala. Não foram necessários TanStack Query ou Zustand: o estado da sala é dirigido pelo hub e as chamadas REST são pequenas, sem cache/retry no cliente original. Não criar abstrações de domínio novas.

## Configuração e rede

- Vite lê apenas `API_BASE_URL` do `.env` na raiz para configurar o proxy Node de `/api` e `/hubs`, incluindo WebSocket. Não injeta o conteúdo do `.env` no bundle. Variáveis de ambiente do processo têm precedência, permitindo testes isolados.
- O browser carrega `/appsettings.json` sem cache. `ApiBaseUrl` vazio usa o mesmo origin, com proxy Vite no desenvolvimento e nginx em Docker. Uma URL absoluta HTTP(S) também é suportada, sujeita à configuração CORS já existente na API.
- Docker recebe somente `REACT_API_UPSTREAM`, usando a rede `proxy` existente. O template nginx mantém os caminhos originais e faz upgrade de WebSocket. Fallback SPA aplica-se às rotas de interface, sem transformar erros da API em HTML.
- Apenas assets com hash recebem cache imutável. `index.html` e configuração permitem atualização/rollback.
- Desenvolvimento HTTPS opcional: `npm run dev:https` verifica o certificado confiável do .NET, exporta-o para `.certs/` (ignorado no Git e Docker) e inicia `https://localhost:5173`. O comando HTTP continua disponível e é utilizado pelos testes. O helper não modifica a confiança do sistema; máquinas sem certificado confiável recebem a instrução `dotnet dev-certs https --trust`.
- Não há mudança nos endpoints, entidades, DTOs, banco, autenticação, bot ou regras de negócio do backend.

## Contratos e sincronização

- Identidade HTTP: `X-Username` com percent encoding. SignalR: `username` na query string.
- Enums continuam números: Play=0, Pause=1, SeekTo=2, ChangeVideo=3, NextVideo=4, PreviousVideo=5; End=0, AfterCurrent=1, PlayNow=2. GUIDs e datas UTC são strings, valores nulos explícitos. Horário do chat é apresentado no fuso local do navegador.
- O emissor de Next/Previous solicita SyncState; o hub envia a ação aos demais clientes, que também sincronizam.
- Cooldown remoto de 1500 ms evita ecos de play/pause/seek. Seek detectado com a mesma condição do JS original: buffering após reprodução e diferença >2 s da última posição conhecida positiva. Progresso é informado a cada 3 s, com ExpectedIndex e sem sobreposição de chamadas.
- Broadcast de playlist com CurrentTime=0 não faz seek para zero em vídeo já carregado. Vídeo diferente inicia na posição informada; playlist vazia encerra o player.
- Histórico e mensagens ao vivo são mesclados por ID e ordenados por data; não disparam alertas duplicados. Antispam local mantém 3 mensagens/20 s e bloqueio de 60 s, além de respeitar ChatBlocked do servidor.
- Reordenação é otimista, preserva o item atual e só reverte após erro se não chegou uma ordem mais nova do servidor.
- Volume, mute e som do chat permanecem locais. Senha não é persistida.

## Ajustes necessários à implementação React

- Uma sessão é criada em efeito e descartada na limpeza, inclusive com o ciclo adicional de desenvolvimento do StrictMode. A conexão verifica descarte após operações assíncronas; timers, player, inscrições e grupo são encerrados ao sair.
- Após reconectar, JoinRoom reinscreve o cliente e recupera estado/histórico. O Blazor original não fazia essa reinscrição explícita.
- Editar o apelido preserva a sessão e as preferências locais, como no Blazor. A identidade de uma conexão SignalR já aberta permanece a informada ao entrar; HTTP usa o apelido atual. Para atualizar a identidade da conexão é necessário sair/reentrar ou recarregar, preservando a semântica original.
- A playlist usa controles independentes em uma linha, evitando os botões HTML aninhados presentes no Razor. Preserva aparência, seleção, remoção e drag-and-drop.
- Erros HTTP de remoção/limpeza são exibidos; o cliente original ignorava alguns status. Falhas de conexão/player recebem feedback visível.
- O botão de reprodução aguarda onReady do YouTube. Restrições de autoplay do navegador continuam aplicáveis; o controle nativo do iframe permanece disponível para ativar a reprodução.
- Modais recebem labels, foco e contenção de Tab. Não houve redesenho intencional de produto.

## Validação isolada

`tests/AssistaJunto.MigrationHost` compila os controllers e hub de produção por links e usa os serviços Application e entidades Domain reais. Substitui exclusivamente os repositórios por memória e desativa rate limiting neste ambiente de teste. Não referencia o bootstrap da API, não lê `.env`, não executa EF/migrations nem inicia o bot ou o serviço de limpeza.

O host pode servir um publish temporário do Blazor na porta 5199. Playwright testa React contra esse hub e permite verificar comunicação entre um cliente Blazor e um cliente React. Os testes determinísticos substituem apenas a API IFrame externa; isso não comprova disponibilidade/reprodução real no YouTube. Não há dublês no aplicativo final.

## Referências técnicas

- [Ciclo de efeitos e limpeza no React](https://react.dev/reference/react/useEffect)
- [Cliente JavaScript SignalR e reconexão](https://learn.microsoft.com/aspnet/core/signalr/javascript-client)
- [Configuração do Vite](https://vite.dev/guide/)
