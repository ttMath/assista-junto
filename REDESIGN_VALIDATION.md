# Redesign React — Cinematográfico Premium

## Auditoria — 19/11/2026

Referência: `src/AssistaJunto.React/assistajunto-prototipo-v3-responsivo.html`, preservado sem alterações. O protótipo define a composição e a identidade visual; seus vídeos, pessoas, reações, durações e operações simuladas não serão incorporados à aplicação.

- Frontend existente: React 19, TypeScript strict, Vite 8, React Router 7, SCSS, Bootstrap estático já disponível. Node 26 e HTTPS local já configurados.
- Rotas reais: `/`, `/sala/:hash`, página de não encontrado. Home identifica o apelido e abre a criação de sala; acesso direto pede nome/senha quando necessário.
- Identidade: `user_name` no localStorage, limite de 50 unidades UTF-16; HTTP usa X-Username e SignalR usa username na query. Não existe JWT/OAuth ou moderação de participantes na interface.
- API: serviços em `src/services/api.ts`; contratos em `src/types/contracts.ts`; endpoints e hub foram auditados e não serão alterados.
- Sala: RoomSession é o estado oficial do cliente. Mantém uma conexão SignalR por sessão, reconexão com reentrada no grupo, histórico, presença, cooldown de eventos, progresso a cada 3 s e descarte de timers/listeners.
- Player: YouTube IFrame API real, play/pause/seek/next/previous, volume/mute locais, troca e fim automático. Duração não faz parte dos DTOs; será lida da API do próprio player, sem inventar duração dos outros vídeos.
- Fila: URL de vídeo/playlist, três modos de inserção, shuffle na adição/próximos, remoção/limpeza, seleção e reorder otimista com rollback condicional. Alternativa por botões acessíveis reutilizará o mesmo endpoint de reorder.
- Chat: histórico de 200, deduplicação por ID, som opcional, antispam local/remoto. Atualmente sempre força scroll; o redesign preservará a leitura de mensagens antigas e adicionará contagem apenas de novos eventos reais.
- Pessoas: displayName e presença por conexão; criador é informado na sala. Não há informação confiável de atividade individual nem ações administrativas suportadas a acrescentar.
- Testes existentes: Vitest/Testing Library e Playwright com host .NET em memória, controllers/hub/serviços reais, testes de interoperabilidade com Blazor e testes opcionais com YouTube real.

## Riscos e decisões

1. O player e a RoomSession permanecerão montados ao trocar de aba, modo cinema ou largura de tela. Não criar layouts React alternativos que remontem essas instâncias.
2. Fila, Chat e Pessoas compartilharão um painel, nessa ordem. A aba inicial será Fila; uma preferência anterior da mesma sala poderá ser recuperada do sessionStorage.
3. Controles de reprodução usarão os comandos existentes. A leitura de tempo/duração será local e isolada da renderização do chat.
4. Cinema é um modo de apresentação, separado da API de tela cheia; nenhum dos dois recria a conexão/player.
5. Testes de igualdade visual com o Blazor devem ser substituídos por verificações do novo layout, pois o redesign foi explicitamente autorizado. Testes funcionais e interoperabilidade serão mantidos e adaptados apenas aos novos controles/abas.
6. Backend e Blazor serão preservados. Não iniciar a API real para testes: seu bootstrap aplica migrations. Utilizar o host em memória existente.

## Implementação

- Tokens SCSS centralizados, superfícies escuras, detalhes roxos, ícones SVG uniformes, foco visível, reduced motion e safe areas. Sass e as dependências existentes foram mantidos.
- Sala composta por VideoSection e RoomSidebar. Player e os três painéis permanecem montados; apenas a visibilidade muda. Fila inicial e preferência por sala no sessionStorage.
- Player 16:9, controles reais, relógio/duração da IFrame API, progresso acessível, volume/mute, cinema e tela cheia. O seek explícito usa o comando SeekTo e expectedIndex já suportados pelo hub.
- Fila real com vídeo atual, próximos e histórico de itens anteriores. Todos os modos de adição, remoção, limpeza, shuffle e drag foram preservados. Botões cima/baixo enviam o mesmo reorder existente, com rollback original.
- Chat real com avatares derivados do nome, horários reais, rascunho preservado, antispam/som existentes, contador apenas de eventos novos de outras pessoas e rolagem que respeita a leitura anterior.
- Pessoas exibem presença real e o criador informado pela sala. Nenhuma função administrativa fictícia foi adicionada.
- Home, modais de nome/senha/criação, perfil, configurações locais, erros, toasts e rota não encontrada receberam a mesma identidade visual.
- Backend, DTOs, endpoints, política de acesso, camada HTTP/SignalR e frontend Blazor não foram alterados. Nenhuma dependência foi adicionada.

## Arquivos criados ou modificados

Todos os caminhos de implementação abaixo são relativos a `src/AssistaJunto.React/`:

- Páginas e inicialização: `src/pages/{Home,Room,NotFound}.tsx`, `src/app/App.tsx`, `src/main.tsx`.
- Componentes existentes: `src/components/{Layout,Modals,Playlist,Chat,Users,Toasts,VideoControls}.tsx`.
- Componentes novos: `src/components/{Icon,ConnectionStatus,VideoSection,RoomSidebar,RoomSettings,WelcomeArt}.tsx` e `src/components/RoomChrome.ts`.
- Adaptações do cliente: `src/features/player/YouTubePlayer.ts` e `src/features/room/RoomSession.ts` (duração/seek e contagem de mensagens; transporte e algoritmos de reconexão preservados).
- Estilos: `src/styles/main.scss` e novos `_tokens.scss`, `_base.scss`, `_layout.scss`, `_room.scss`, `_panels.scss`, `_dialogs.scss`, `_home.scss`. Os SCSS antigos permanecem no repositório; o entrypoint utiliza o novo design system.
- Testes: `tests/session.test.ts`, novo `tests/redesign.test.tsx`, `tests/e2e/{helpers,flows.spec,parity.spec,recovery.spec,youtube-live.spec}.ts` e novo `tests/e2e/redesign.spec.ts`.
- Documentação na raiz: `README.md` e este relatório. O protótipo fornecido foi somente lido.

## Validação — 19/11/2026

Ambiente: Windows, Node 26.13.1, Edge/Chromium via Playwright. Comandos executados no diretório React, com o runtime portátil existente no PATH:

```powershell
npm run check
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:e2e
```

Resultados:

- ESLint: sem erros ou warnings.
- Vitest: **30 testes passaram** em 5 arquivos, incluindo os 24 testes anteriores e 6 testes adicionais de redesign/seek/contagem.
- TypeScript e build Vite de produção: **sucesso**, 77 módulos; CSS 35,06 kB e JavaScript 376,09 kB (8,15/114,05 kB gzip).
- Playwright determinístico: **34 testes passaram**, desktop e Pixel 7 emulado; 6 casos externos foram ignorados nessa execução e tratados separadamente.
- Fluxos exercitados: nome/criação/entrada/senha, owner bypass, perfil/saída, adição nos três modos e erros de importação, reorder por drag/teclado/toque, remoção/limpeza/shuffle, play/pause/troca/seek entre clientes, histórico/chat/antispam/som, presença e reconexão sem duplicatas.
- Interoperabilidade real Blazor ↔ React no mesmo hub: mensagens e reprodução passaram. O host publica o Blazor original para esse teste.
- Abas: ordem exata, Fila inicial, navegação por setas/Home, rascunho e preferência preservados. Cinema e fullscreen preservaram instância, posição e volume do player. Contagem de chat não confunde histórico com novas mensagens.
- Home e sala sem overflow horizontal em **320, 375, 390, 430, 768, 1024, 1440 e 1920 px**. Sala também verificada em paisagem **844 × 390**. Proporção 16:9, hierarquia desktop/mobile e ausência de novas instâncias/conexões verificadas por assertions.
- Capturas de Home e das três abas revisadas visualmente em desktop e mobile, disponíveis localmente em `artifacts/redesign/` (ignoradas no Git).
- A primeira rodada identificou o slider de volume oculto no mobile. O layout foi corrigido e os dois testes afetados passaram na repetição completa.
- `git diff --check`: sucesso.

O host de testes utiliza repositórios em memória com controllers, hub, serviços e domínio reais. Não lê o `.env`, não acessa PostgreSQL nem executa as migrations da API real. O substituto de player existe somente nos testes determinísticos; a aplicação continua usando o YouTube real.

### YouTube externo

```powershell
$env:RUN_YOUTUBE_LIVE = '1'
npm run test:e2e -- tests/e2e/youtube-live.spec.ts --project=desktop
```

**3 testes passaram** em 23 s: carregamento e reprodução no iframe real, dois players reais reproduzindo/pausando juntos via SignalR (diferença de posição inferior a 3 s) e importação real de URL/metadados após o vídeo atual. Nenhum teste externo depende de dados da API de produção. Ao terminar, o Playwright encerrou os servidores de teste que iniciou.

## Limitações de validação

- Mobile foi exercitado por emulação Chromium com toque; aparelhos físicos, teclado virtual real, Safari/iOS e Firefox não foram utilizados.
- Duração de vídeos que ainda não estão no player não está disponível nos contratos existentes e não foi inventada. O player exibe a duração real quando fornecida pelo YouTube.
- Não houve deploy remoto, teste de carga ou acesso ao banco de produção. A integração externa de playlists grandes não foi exercitada; os comandos e modos do frontend foram cobertos pelos testes existentes. A validação Docker posterior está registrada na seção de seleção de produção abaixo.

## Ajuste de rolagem — 20/11/2026

- Cabeçalho sticky no topo em desktop e mobile, respeitando a safe area e permanecendo abaixo dos modais.
- Acima de 1024 px, painel Fila/Chat/Pessoas sticky com 20 px de distância do cabeçalho. Altura limitada ao espaço da janela, com rolagem interna e acesso aos controles da fila em janelas baixas. A margem inferior do layout acompanha esse espaço para o painel não entrar atrás do cabeçalho ao chegar ao fim da página.
- No mobile/tablet, o painel continua abaixo do vídeo; somente o cabeçalho acompanha a rolagem. Player, conexão e lógica da sala não foram alterados.
- `npm run build`: TypeScript e build de produção aprovados.
- Verificação pontual Playwright em host em memória: 2 cenários aprovados, com playlist de 15 itens. Desktop em 1920×1080, 1440×900 e 1366×600; mobile em 390×844, 320×568 e paisagem 844×390. Verificados cabeçalho durante a rolagem, limites do painel, acesso ao campo de adicionar vídeo, rolagem da fila, rascunho do chat, ausência de overflow horizontal e preservação da instância do player.
- Foi utilizada a porta 5174 para QA, preservando o Vite do usuário na porta 5173. Servidores de QA encerrados ao final. Capturas locais: `artifacts/redesign/sticky-*.png`. `git diff --check` aprovado.

## Seleção de produção — 20/11/2026

Conforme solicitado, `docker-compose.yml` passou a selecionar `react-client.Dockerfile` no serviço `client`, com Traefik ativo, domínio `www.assistajunto.com.br`, HTTPS e redirecionamento do domínio raiz preservados. O frontend recebe somente `REACT_API_UPSTREAM`, sem receber o `.env` completo. API, bot, banco, volumes e contratos não foram alterados.

`docker-compose.blazor.yml` permite voltar ao Dockerfile Blazor no mesmo serviço e domínio. O preview opcional `react-client` continua limitado à porta local, com Traefik desativado para evitar duas rotas públicas concorrentes. O pipeline usa explicitamente o Compose principal e prepara um `.env` de exemplo somente no runner de CI para validar o build. Instruções de aplicação e rollback em `MIGRATION_ROLLBACK.md` e `README.md`.

Validação executada com Docker Desktop 29.9.3:

- `docker compose -f docker-compose.yml config --quiet`: aprovado.
- Configurações combinadas com `docker-compose.blazor.yml` e com o preview React: aprovadas. Assertions confirmaram Dockerfile React + Traefik ativo na produção, Dockerfile Blazor no rollback e preview sem Traefik.
- `docker build --tag assistajunto-react:production-check --file react-client.Dockerfile .`: aprovado; Node 26, `npm ci`, TypeScript e build Vite concluídos dentro da imagem.
- Container nginx iniciado isoladamente em uma porta local dinâmica, apontando para o host de testes em memória. `nginx -t`: aprovado. Nenhum serviço de produção, `.env` privado ou banco foi usado nessa execução.
- QA Playwright contra o bundle de produção no container: Home, fallback direto de `/sala/...`, configuração no mesmo origin sem cache, assets com cache imutável, favicon, erro HTTP da API preservado sem fallback HTML, WebSocket real pelo nginx, atualização da fila por reorder, chat, play/pause entre dois clientes e histórico após recarregar: aprovados.
- Apenas o player externo foi substituído nesse QA; HTTP, nginx, SignalR, controllers e domínio eram reais. Os testes com YouTube real registrados anteriormente continuam sendo evidência separada.
- Capturas locais em `artifacts/redesign/production-container-{desktop,mobile}.png`. Container e host de QA encerrados ao final; o PostgreSQL já existente foi preservado.

Não houve push, merge, execução de workflow remoto ou deploy no servidor. A branch local é `migracao-react`; o pipeline publica pushes na `main`. Para aplicar somente o frontend em uma stack existente, atualizar os arquivos no servidor e executar `docker compose -f docker-compose.yml build client` seguido de `docker compose -f docker-compose.yml up -d --no-deps client`.

## Revisão dos Dockerfiles e nginx — 20/11/2026

### Correções

- `react-client.Dockerfile`: mantido o build em Node 26 e runtime apenas nginx. Cache BuildKit para npm, dependências de desenvolvimento explicitamente incluídas no build (Vite/TypeScript/Sass são necessários ali), upstream padrão, substituição limitada às variáveis do template, remoção das páginas padrão do nginx e healthcheck local em `/healthz`.
- `docker/react-upstream.envsh`: normaliza a barra final e valida que o upstream é uma origem HTTP(S), antes de gerar o nginx. A imagem oficial continua responsável por seu entrypoint, descoberta de resolvers e envsubst.
- `docker/react-nginx.conf.template`: DNS resolvido em runtime com os resolvers reais do container, permitindo que nginx inicie sem API e reencontre a API após mudança de IP. Caminhos e queries originais preservados. Proxy HTTP/SignalR unificado, upgrade WebSocket mantido, HTTPS encaminhado pelo Traefik preservado, gzip ativado, cache imutável limitado aos assets com hash e arquivos públicos ausentes retornando 404 em vez de HTML.
- `.dockerignore`: artifacts de QA, cobertura, configurações locais de desenvolvimento e arquivos de IDE ficam fora do contexto. `.env`, certificados locais, node_modules e saídas de build continuam excluídos.
- `client.Dockerfile` e `.gitattributes`: o entrypoint Blazor estava com CRLF nesta máquina; agora há normalização explícita no build e arquivos shell usam LF em novos checkouts. O Blazor permanece disponível para rollback.
- `Dockerfile` da API: `ASPNETCORE_HTTP_PORTS=5000` alinha o padrão da imagem à porta exposta e usada pelo Compose. O Compose já definia essa porta por `ASPNETCORE_URLS`; as regras da API não mudaram.
- `pipocabot.Dockerfile`: mantido. O bot usa o runtime .NET de console e não precisa de nginx, Node ou um endpoint HTTP de saúde.
- CI: os dois workflows passam a executar os testes de container; o pipeline de produção utiliza `set -eu` e `--wait --wait-timeout 120`, interrompendo o deploy após erro ou falha de saúde em vez de considerar apenas a criação do container.

### Validação

- Build Docker React aprovado.
- `node --test tests/docker/react-container.test.mjs`: **8 testes aprovados** (7 cenários e o teste agregador). Inclui troca efetiva da API para outro IP sem reiniciar nginx, upstream com barra final e rejeição de origem inválida.
- QA Playwright repetido contra a imagem revisada com o hub/controllers reais do host em memória: HTTP, acesso direto à sala, cache, WebSocket, reorder recebido por outro cliente, chat, play/pause e histórico após reload aprovados. O player externo permanece substituído apenas nesse teste isolado.
- Configurações Compose principal, rollback Blazor e preview React aprovadas. `nginx -t` e healthcheck do container aprovados.
- Builds Docker da API, bot e Blazor aprovados. A imagem da API foi inspecionada para confirmar `ASPNETCORE_HTTP_PORTS=5000`, sem iniciar a aplicação. O container Blazor também iniciou com sucesso; configuração de API por entrypoint e acesso direto a uma rota SPA foram verificados. O bot não foi iniciado nem conectado ao Discord.

### Pendências reais encontradas no build .NET

Os builds passaram, com avisos NuGet preexistentes de vulnerabilidades em dependências diretas/transitivas. A revisão dos Dockerfiles não atualizou o grafo de pacotes do backend ou Blazor:

- NU1902: `AngleSharp` 1.4.0; `System.Security.Cryptography.Pkcs` 9.0.11/10.0.7.
- NU1903: `Microsoft.AspNetCore.SignalR.Common` 10.0.3, `Microsoft.OpenApi` 2.0.0, `System.Security.Cryptography.Pkcs` 9.0.11/10.0.7 e `System.Security.Cryptography.Xml` 10.0.7.

Esses avisos precisam de uma revisão específica das versões .NET/NuGet e testes de compatibilidade. Os logs locais estão em `artifacts/redesign/docker-*-review.log`.

Não foram executados a API de produção, o bot Discord, migrations ou deploy remoto. O PostgreSQL já existente foi preservado.

### Referências técnicas

- [Proxy e resolução de nomes em variáveis nginx](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass).
- [Entrypoint e envsubst da imagem nginx oficial](https://hub.docker.com/_/nginx/), [descoberta de resolvers](https://github.com/nginx/docker-nginx/blob/master/entrypoint/15-local-resolvers.envsh).
- [Cache de pacotes no BuildKit](https://docs.docker.com/build/cache/optimize/).

## Validação do projeto .NET — 20/11/2026

Criado `tests/AssistaJunto.Tests`, projeto C# .NET 10 com xUnit, incluído na solução. A API de produção não foi modificada. O host isolado existente recebeu apenas a declaração pública parcial de `Program` necessária ao `WebApplicationFactory`.

Criado `.github/workflows/dotnet-validation.yml`, reutilizável e executável manualmente, com `actions/checkout@v7`, `actions/setup-dotnet@v6`, SDK `10.0.x`, restore/build da API e restore/build/test dos testes. O pipeline chama esse workflow em um job próprio e o deploy passa a depender de `ci` e `dotnet`. A validação .NET não executa npm nem depende do React.

Validação local efetivamente executada:

- Build Release de `src/AssistaJunto.API/AssistaJunto.API.csproj`: sucesso, zero erros. Os avisos NuGet preexistentes descritos anteriormente permanecem.
- Restore e build Release de `tests/AssistaJunto.Tests/AssistaJunto.Tests.csproj`: sucesso.
- `dotnet test ... --no-build --no-restore --logger trx --results-directory artifacts/dotnet-tests`: **23 testes passaram**, sem falhas ou skips. Relatório TRX disponível em `artifacts/dotnet-tests/`.
- Cobertura funcional: senha, identidade Unicode, limite/duplicação de salas, exclusão somente pelo dono, reorder e remoção preservando o vídeo atual, limpeza, navegação, shuffle, posição/progresso com índice desatualizado, chat, histórico, antispam, presença e reentrada pelo SignalR.

Os testes HTTP e SignalR usam o host em memória, com endpoints e serviços reais, por TestServer/Long Polling. Não validam EF/PostgreSQL, migrations ou os middlewares CORS/rate limiting do bootstrap de produção. Não foi executado workflow remoto nesta sessão. Referências: [testes xUnit com dotnet test](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-csharp-with-xunit), [integração ASP.NET Core com WebApplicationFactory](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests?view=aspnetcore-10.0).
