# Validação da migração

Data: 16/11/2026. Ambiente: Windows, .NET SDK 10.0.403, Node 24 LTS portátil, Edge/Chromium headless. A API de desenvolvimento já aberta pelo usuário não foi reiniciada ou utilizada para gravar dados.

## Atualização para Node 26 — 17/11/2026

A pedido do usuário, `.nvmrc`, engines do package.json, tipagens `@types/node`, lockfile, imagem Docker e CI foram alinhados ao Node 26. Validação executada com Node 26.13.1 e npm 11.20.0:

- `npm ci`: aprovado.
- `npm run check`: lint e tipos sem erros, 24 testes unitários/componentes aprovados e build de produção aprovado.
- Teste de navegador desktop do fluxo de entrada, criação de sala, edição do nome e navegação: aprovado com os servidores de teste iniciados pelo Node 26 e sem uso do banco real.
- `npm audit --omit=dev`: zero vulnerabilidades. A auditoria completa atual reporta 13 alertas altos na cadeia de ferramentas de desenvolvimento associados ao picomatch; o resultado histórico de zero alertas de 16/11 abaixo não representa a auditoria atual. Esses pacotes não foram trocados nesta atualização de runtime.
- Build/execução da imagem Docker continuam pendentes por indisponibilidade do Docker neste ambiente.

Os resultados da migração original estão preservados abaixo; a suíte ampliada com YouTube real não foi repetida para esta atualização de Node.

## Verificações executadas

HTTPS local adicionado e verificado em 17/11/2026: `npm run dev:https` reutiliza o certificado confiável de desenvolvimento do .NET. A página respondeu 200 com validação TLS habilitada; o Edge carregou a Home sem ignorar erros de certificado e o HMR utilizou WSS. O acesso HTTP à chave privada retornou 403 pela proteção padrão do Vite. Certificado e chave ficam em `.certs/`, excluídos do Git e do contexto Docker. A verificação usou a porta 5174 para preservar o Vite HTTP do usuário na 5173; o servidor de verificação foi encerrado. Lint, tipos, 24 testes unitários/componentes e build continuaram aprovados. O modo HTTP padrão dos testes permanece disponível.

| Verificação | Resultado e escopo |
|---|---|
| TypeScript strict | Aprovado, sem erros |
| ESLint | Aprovado, sem warnings |
| Vitest + React Testing Library | 24 testes aprovados: identidade UTF-16, enums, HTTP, erros, chat, throttle, reordenação, sincronização, descarte e criação de sala em StrictMode |
| Build React de produção | Aprovado; artefatos em `src/AssistaJunto.React/dist` |
| Build .NET Release | Aprovado; Blazor, backend e bot preservados; avisos preexistentes de pacotes/campos não utilizados |
| Publish Blazor Release | Aprovado; executado no navegador a partir de cópia temporária |
| Playwright determinístico | 24 cenários em desktop e emulação Pixel 7; HTTP, SignalR, controllers, serviços e entidades reais, repositórios em memória, IFrame API substituta apenas nos testes |
| Interoperabilidade | Um cliente Blazor e um React na mesma sala trocando chat, play, próximo vídeo e limpeza da playlist, em desktop e mobile |
| Reconexão | WebSocket encerrado intencionalmente com código 1012; nova conexão recupera grupo, estado, chat e presença sem duplicação |
| Reordenação | Drag-and-drop, índice atual preservado no servidor, atualização no segundo cliente; rollback condicional coberto por testes unitários |
| Controles locais | Volume e mute não alteram o segundo cliente; edição do apelido preserva preferências locais |
| Regressão visual | Home e sala comparadas ao publish Blazor no mesmo browser; cores e dimensões principais (tolerância de 2 px) e diferença máxima de 1% dos pixels; desktop e mobile |
| YouTube real | Testes opcionais para reprodução nativa, dois players reais com play/pause e posição próxima, e importação de vídeo por URL com metadados reais; execução separada dos testes determinísticos |
| npm audit | Zero vulnerabilidades nas dependências React verificadas, incluindo desenvolvimento |
| Preservação | Nenhuma alteração no Client Blazor, API, Application, Domain, Infrastructure, bot, compose original ou Dockerfile Blazor |

Rodada ampliada com `RUN_YOUTUBE_LIVE=1`: **27 testes de navegador aprovados e 3 ignorados intencionalmente** (serviço externo em mobile). Os três testes externos desktop passaram, incluindo observação da posição real dos dois vídeos. A suíte padrão, sem a variável, executa 24 testes determinísticos e ignora os seis externos. Não foram usados retries para converter falhas em aprovação.

## Cenários de navegador

`flows.spec.ts`: entrada por Enter, criação de sala, edição do nome, confirmação de saída, acesso direto, nome obrigatório, senha inválida/válida, bypass do dono, dois clientes, histórico após reload, play/next/remove/clear, abas/presença, antispam, toggle de som, logout, sala inexistente, rotas desconhecidas, três modos de inserção e shuffle, erro de importação e cópia da URL completa.

`parity.spec.ts`: interoperabilidade Blazor/React e comparação geométrica/pixel de Home e sala, incluindo limites de overflow em mobile. As capturas desativam animações e ocultam apenas toasts transitórios. A comparação usa o Blazor publicado na própria execução, evitando baselines dependentes do sistema operacional.

`recovery.spec.ts`: reconexão real, reentrada no grupo, continuidade de eventos, drag-and-drop, preservação do vídeo corrente e preferências locais.

`youtube-live.spec.ts`: testes explicitamente opcionais contra o serviço externo. A reprodução inicial com áudio pode exigir interação dentro do iframe; o teste nativo utiliza o botão acessível “Play video”. Para sincronização de dois players, os usuários escolhem mute local antes do play, respeitando as políticas normais de autoplay. A posição real do elemento de vídeo é observada e comparada com tolerância de 3 segundos; depois é verificada a pausa no outro player. A importação real valida título, ID e inserção após o vídeo atual. Não são usados mecanismos de contorno de restrições.

## Reproduzir as verificações

Nesta máquina, o Node não estava no PATH. Foi utilizado um runtime portátil temporário sem instalação global. Para reutilizá-lo no PowerShell enquanto o cache existir:

```powershell
$env:PATH = "$env:TEMP\assistajunto-node\node-v26.13.1-win-x64;$env:PATH"
```

Para uso contínuo, o projeto declara Node 26 LTS em `.nvmrc` e `package.json`. Docker e CI também selecionam a versão 26. Os resultados iniciais de 16/11 acima foram obtidos com Node 24; a atualização de runtime foi realizada em 17/11/2026.

```sh
npm --prefix src/AssistaJunto.React ci
npm --prefix src/AssistaJunto.React run check
npm --prefix src/AssistaJunto.React exec -- playwright install chromium
npm --prefix src/AssistaJunto.React run test:e2e
dotnet build assistajunto.slnx -c Release
```

Sem `RUN_YOUTUBE_LIVE`, os seis casos externos (três por projeto de browser) são ignorados intencionalmente. O restante da suíte não depende do YouTube externo. Para executar os testes externos em desktop no PowerShell:

```powershell
$env:RUN_YOUTUBE_LIVE = '1'
# Opcional: Edge já instalado, em vez do Chromium do Playwright
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm --prefix src/AssistaJunto.React run test:e2e
```

O Playwright encerra os servidores que iniciou ao terminar. Relatórios, screenshots e traces ficam em `src/AssistaJunto.React/playwright-report` e `test-results` (ignorados no Git). Falhas geram traces e capturas para diagnóstico. A suíte não precisa de PostgreSQL nem do `.env`.

Para manter o isolamento, os testes recusam servidores já abertos nas portas 5173 e 5199. Encerre o Vite de desenvolvimento com `Ctrl+C` antes da execução; a API real pode continuar aberta em sua porta habitual.

## Limites e pendências

- Na validação inicial o Docker não estava disponível. Em 20/11/2026, Docker Desktop passou a estar disponível: build da imagem React e testes HTTP/SignalR no container nginx foram aprovados; detalhes em `REDESIGN_VALIDATION.md`. Nenhum workflow remoto foi executado nesta sessão.
- Mobile foi validado por emulação Chromium/Pixel 7; não foram utilizados aparelhos físicos, Safari ou Firefox.
- A importação de vídeo e seus metadados foram exercitados contra o YouTube real. A importação de playlists externas grandes e o shuffle do serviço remoto não foram exercitados; os modos e payloads do frontend são testados e a implementação de backend permanece a original.
- Os testes não utilizam PostgreSQL: a equivalência de persistência depende do backend preservado. Não foram realizadas migrations, exclusões de dados, alterações de schema ou testes de carga em produção.
- Autoplay com áudio depende das políticas do browser e do serviço externo. O player nativo permanece disponível; não há alteração dessas políticas na migração.
- O build Debug inicial encontrou DLLs bloqueadas pela API já aberta no computador. O build Release separado passou sem encerrar esse processo.
- `git diff --check` global detecta um espaço em branco preexistente em `.vscode/launch.json`; esse arquivo e `.vscode/settings.json` pertencem às alterações anteriores do usuário e foram preservados.

## Estado de entrega

Frontend React implementado separadamente; Blazor preservado permanentemente e executável. A validação local cobre os cenários acima. Em 20/11/2026, mediante solicitação de troca em produção, o Compose principal passou a selecionar React no serviço `client`; `docker-compose.blazor.yml` oferece rollback. Não houve deploy remoto: a configuração precisa chegar ao servidor pelo pipeline da `main` ou pelos comandos de `MIGRATION_ROLLBACK.md`. A validação local não comprova os itens explicitamente pendentes.
