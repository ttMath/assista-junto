# Assista Junto — Guia de Instruções para IA

## Visão Geral

**Assista Junto** é uma plataforma web de consumo de mídia em grupo, exclusiva para membros do servidor Discord **JAÇA CITY**. Os usuários fazem login via Discord OAuth2, entram em um lobby e podem criar ou acessar salas de exibição sincronizada de vídeos do YouTube (estilo Watch2Gether).

## Estrutura do Monorepo

```
assistajunto/
├── claude-instructions.md          # Este arquivo
├── assistajunto.slnx               # Solução .NET
├── README.md
├── .env                            # Variáveis de ambiente (NÃO commitado)
├── .env.example                    # Template do .env (commitado)
├── .dockerignore
├── Dockerfile                      # Build/runtime da API
├── client.Dockerfile               # Build (SDK) + runtime (nginx) do Client
├── docker-compose.yml              # Stack completa: Traefik + API + Client + Postgres
├── docker/
│   ├── nginx.conf                  # Config do nginx para SPA Blazor WASM
│   └── client-entrypoint.sh       # Injeta API_BASE_URL no appsettings.json em runtime
└── src/
    ├── AssistaJunto.Domain/                # Camada de Domínio (DDD)
    │   ├── Entities/                       # Entidades de domínio
    │   ├── Enums/                          # Enumerações
    │   └── Interfaces/                     # Contratos de repositório
    │
    ├── AssistaJunto.Application/           # Camada de Aplicação
    │   ├── DTOs/                           # Data Transfer Objects
    │   ├── Interfaces/                     # Contratos de serviço
    │   └── Services/                       # Implementação dos serviços
    │
    ├── AssistaJunto.Infrastructure/        # Camada de Infraestrutura
    │   ├── Data/                           # DbContext e Configurações EF Core
    │   ├── Repositories/                   # Implementação dos repositórios
    │   └── Migrations/                     # Migrations do EF Core
    │
    ├── AssistaJunto.API/                   # Camada de Apresentação (API)
    │   ├── Controllers/                    # Endpoints REST
    │   ├── Hubs/                           # SignalR Hubs
    │   └── appsettings.json               # Apenas Logging + AllowedHosts (sem segredos)
    │
    └── AssistaJunto.Client/                # Blazor WebAssembly
        ├── Pages/                          # Páginas/Rotas
        ├── Components/                     # Componentes reutilizáveis
        ├── Services/                       # Serviços do cliente (HTTP, SignalR)
        ├── Models/                         # Modelos do lado cliente
        └── wwwroot/
            ├── appsettings.json                        # ApiBaseUrl vazio (Docker preenche via entrypoint.sh)
            └── appsettings.Development.json.example   # Template local (o .json real é gitignored)
```

## Stack Tecnológico

| Camada         | Tecnologia                                   |
| -------------- | -------------------------------------------- |
| Framework      | .NET 10                                      |
| Frontend       | Blazor WebAssembly (WASM)                    |
| Backend        | ASP.NET Core Web API                         |
| Arquitetura    | Domain-Driven Design (DDD)                   |
| Tempo Real     | SignalR (WebSockets)                         |
| Banco de Dados | PostgreSQL 16                                |
| ORM            | Entity Framework Core 10                     |
| Autenticação   | Discord OAuth2 + JWT                         |
| Player         | YouTube IFrame Player API via JSInterop      |
| Deploy         | Docker + Docker Compose                      |
| Reverse Proxy  | Traefik v3 (SSL via Let's Encrypt)           |
| Servidor Web   | nginx:alpine (serve estáticos do WASM)       |

## Padrões de Código

### Geral
- Namespaces seguem a estrutura de pastas: `AssistaJunto.{Camada}.{Subpasta}`
- Interfaces prefixadas com `I` (ex: `IRoomRepository`)
- Métodos assíncronos sufixados com `Async`
- Injeção de dependência via construtor em todas as camadas
- Sem lógica de negócio nos Controllers — delegam para Application Services

### Domain Layer
- Entidades possuem construtores privados/protegidos para EF Core
- Validações de domínio dentro das entidades (fail-fast)
- Sem dependência de frameworks externos (puro C#)

### Application Layer
- DTOs para comunicação entre camadas (nunca expor entidades de domínio)
- Services orquestram repositórios e regras de negócio
- Referencia apenas Domain

### Infrastructure Layer
- Implementação concreta dos repositórios
- DbContext e configurações de entidades (Fluent API)
- Referencia Domain e Application

### API Layer
- Controllers finos — apenas roteamento e conversão DTO
- Hubs SignalR para comunicação em tempo real
- Referencia Application e Infrastructure

## Configuração de Ambiente

### Regra fundamental
**O `.env` na raiz do repositório é a única fonte de verdade para todas as configurações.**
Nenhum arquivo de código ou `appsettings.json` contém URLs, segredos ou credenciais.

### Como funciona por camada

**API (backend):**
- `DotNetEnv.Env.TraversePath().Load()` no topo de `Program.cs` carrega o `.env` da raiz
- O `.env` define variáveis com `__` como separador de hierarquia (`Jwt__Secret` → `Jwt:Secret`)
- `appsettings.json` contém **apenas** `Logging` e `AllowedHosts`
- Se uma variável obrigatória estiver ausente, a API lança `InvalidOperationException` na inicialização (fail-fast)

**Client (Blazor WASM):**
- Blazor WASM roda no browser — não pode ler variáveis de ambiente diretamente
- Em **desenvolvimento local**: cria `wwwroot/appsettings.Development.json` a partir do `.example` (gitignored)
- Em **Docker/produção**: `docker/client-entrypoint.sh` injeta `API_BASE_URL` do `.env` no `appsettings.json` antes do nginx subir

### Variáveis do `.env`

```
# Banco de Dados
POSTGRES_USER=postgres
POSTGRES_PASSWORD=
POSTGRES_DB=assistajunto
ConnectionStrings__DefaultConnection=Host=localhost;Port=5432;Database=assistajunto;Username=postgres;Password=

# Discord OAuth2
Discord__ClientId=
Discord__ClientSecret=
Discord__RedirectUri=https://localhost:7045/api/auth/callback

# JWT
Jwt__Secret=
Jwt__Issuer=AssistaJunto
Jwt__Audience=AssistaJuntoClient
Jwt__ExpirationInHours=24

# URLs
ClientUrl=https://localhost:7036        # CORS da API — URL do frontend
API_BASE_URL=https://localhost:7045     # URL da API usada pelo client WASM

# Traefik / Let's Encrypt (produção)
ACME_EMAIL=seu@email.com

# ZeroTier (opcional)
# ZeroTier__ApiUrl=
# ZeroTier__ClientUrl=
```

### Setup inicial de desenvolvimento local
```sh
# 1. Copiar os templates
cp .env.example .env
cp src/AssistaJunto.Client/wwwroot/appsettings.Development.json.example \
   src/AssistaJunto.Client/wwwroot/appsettings.Development.json

# 2. Preencher .env com suas credenciais Discord e Jwt__Secret

# 3. Subir banco (opcional — ou usar postgres local)
docker compose up postgres -d

# 4. Rodar API e Client
dotnet run --project src/AssistaJunto.API
dotnet run --project src/AssistaJunto.Client
```

## Deploy com Docker

### Arquitetura dos containers

```
Internet :80/:443
    │
  Traefik  (único com portas no host)
    ├── api.assistajunto.com.br  → api    container :5000  (rede: proxy + internal)
    └── www.assistajunto.com.br  → client container :3000  (rede: proxy)

                                    postgres :5432          (rede: internal — isolado)
```

- Rede `proxy`: Traefik + API + Client
- Rede `internal`: API + PostgreSQL (isolada, sem acesso externo)
- Apenas o Traefik expõe portas no host (`80` e `443`)
- Traefik gerencia certificados SSL automaticamente via Let's Encrypt (TLS Challenge)

### Dockerfiles

| Arquivo | Função |
|---|---|
| `Dockerfile` | Build multi-stage da API: `sdk:10.0` compila, `aspnet:10.0` roda na porta `5000` |
| `client.Dockerfile` | Build multi-stage do Client: `sdk:10.0` publica WASM, `nginx:alpine` serve na porta `3000` |

### Variáveis que mudam para produção no `.env`

```
Discord__RedirectUri=https://api.assistajunto.com.br/api/auth/callback
ClientUrl=https://www.assistajunto.com.br
API_BASE_URL=https://api.assistajunto.com.br
ACME_EMAIL=voce@seudominio.com
POSTGRES_PASSWORD=senha_forte_aqui
Jwt__Secret=segredo_longo_aleatorio_min_32_chars
```

> `ConnectionStrings__DefaultConnection` **não precisa ser alterada** — o `docker-compose.yml`
> sobrescreve a connection string automaticamente usando `Host=postgres` (hostname interno do Docker).

### Comandos de deploy

```sh
# Primeiro deploy
docker compose up -d --build

# Atualizar após git pull
git pull
docker compose up -d --build

# Ver logs
docker compose logs -f api
docker compose logs -f client
```

## Regras de Sincronização do Player

1. **Eventos sincronizados** (broadcast para toda a sala via SignalR):
   - `Play` — Retoma a reprodução
   - `Pause` — Pausa a reprodução
   - `SeekTo(seconds)` — Avança/retrocede para o tempo especificado
   - `ChangeVideo(videoId)` — Troca o vídeo atual
   - `NextVideo` — Avança para o próximo da playlist
   - `PreviousVideo` — Volta ao vídeo anterior

2. **Eventos locais** (NÃO sincronizados):
   - `SetVolume(level)` — Volume local
   - `Mute/Unmute` — Mutar local

3. **Sincronização ao entrar**: Quando um usuário entra em uma sala ativa, o servidor envia o estado atual: `{ videoId, currentTime, isPlaying, playlistIndex }`

## Contratos da API (Endpoints Principais)

### Autenticação
- `GET /api/auth/discord` — Redireciona para Discord OAuth2
- `GET /api/auth/callback?code=xxx` — Callback do Discord OAuth2, redireciona ao Client com `?token=JWT` ou `?error=msg`
- `GET /api/auth/me` — Retorna dados do usuário logado (requer JWT)
- `PUT /api/auth/nickname` — Atualiza nickname customizado (requer JWT)

### Fluxo de Autenticação Discord OAuth2
1. Client: Botão "Entrar com Discord" → link para `{API}/api/auth/discord`
2. API: Redireciona para `discord.com/api/oauth2/authorize` com scope `identify`
3. Discord: Após aprovação, redireciona para `{API}/api/auth/callback?code=xxx`
4. API: Troca `code` por access token, busca dados do user no Discord, cria/atualiza no banco, gera JWT
5. API: Redireciona para `{Client}/auth/callback?token=JWT`
6. Client (`AuthCallback.razor`): Salva JWT no localStorage, carrega dados do user via `/api/auth/me`, redireciona para Home
7. Client (`MainLayout`): Em `OnAfterRenderAsync`, lê token do localStorage e carrega user se autenticado

### Observações Importantes
- `localStorage` só funciona em `OnAfterRenderAsync` no Blazor WASM (não em `OnInitializedAsync`)
- `AuthStateService` é registrado como **Scoped** (depende de `IJSRuntime`)
- `ApiService.SetAuth()` sempre sobrescreve o header Authorization (evita duplicação)
- `UseHttpsRedirection()` só é aplicado em `Development` — em produção o Traefik termina o TLS

### Salas
- `POST /api/rooms` — Cria uma nova sala
- `GET /api/rooms` — Lista salas ativas (lobby)
- `GET /api/rooms/{hash}` — Detalhes de uma sala
- `POST /api/rooms/{hash}/join` — Entra na sala (com senha, se necessário)

### Playlist
- `POST /api/rooms/{hash}/playlist` — Adiciona vídeo à playlist
- `DELETE /api/rooms/{hash}/playlist/{itemId}` — Remove vídeo da playlist
- `GET /api/rooms/{hash}/playlist` — Lista a playlist da sala

### SignalR Hub (`/hubs/room`)
- `JoinRoom(roomHash)` — Entra no grupo SignalR da sala
- `LeaveRoom(roomHash)` — Sai do grupo SignalR
- `SendPlayerAction(roomHash, action)` — Envia ação do player
- `SendChatMessage(roomHash, message)` — Envia mensagem no chat
- `ReceivePlayerAction(action)` — Recebe ação do player (client handler)
- `ReceiveChatMessage(message)` — Recebe mensagem do chat (client handler)
- `ReceiveRoomState(state)` — Recebe estado atual ao entrar (client handler)

## Changelog

- **v0.2.0** — Infraestrutura de deploy: Docker multi-stage (API + Client), docker-compose com Traefik + PostgreSQL, `.env` como única fonte de verdade (removidos todos os segredos e URLs de `appsettings.json` e código), nginx para servir Blazor WASM, `client-entrypoint.sh` para injeção de config em runtime.
- **v0.1.0** — Estrutura inicial do monorepo, entidades de domínio, configuração DDD, SignalR Hub base, Blazor WASM scaffold.
