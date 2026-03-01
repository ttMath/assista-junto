# Assista Junto — Guia de Instruções para IA

## Visão Geral

**Assista Junto** é uma plataforma web de consumo de mídia em grupo, criada para a comunidade **JAÇA CITY**. Os usuários informam seu nome ao acessar (armazenado no localStorage do navegador), entram em um lobby e podem criar ou acessar salas de exibição sincronizada de vídeos do YouTube (estilo Watch2Gether). Não há autenticação externa — a identidade do usuário é apenas o nome escolhido.

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
| Autenticação   | Nome no localStorage (sem auth externa)      |
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
- O `.env` define variáveis com `__` como separador de hierarquia (`ConnectionStrings__DefaultConnection` → `ConnectionStrings:DefaultConnection`)
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

# 2. Preencher .env com a senha do Postgres (se necessário)

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
ClientUrl=https://www.assistajunto.com.br
API_BASE_URL=https://api.assistajunto.com.br
ACME_EMAIL=voce@seudominio.com
POSTGRES_PASSWORD=senha_forte_aqui
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

### Identificação do Usuário
- Não existe autenticação externa (sem Discord OAuth2, sem JWT)
- O usuário informa seu nome na tela inicial do Client, que é salvo no `localStorage` do navegador (chave `user_name`)
- O Client envia o nome via header `X-Username` em todas as requisições HTTP à API
- O Client envia o nome via query string `?username=` na conexão SignalR
- A API **não** cria nem persiste usuários no banco — o nome é apenas uma string usada como identificador de display
- As entidades `Room`, `ChatMessage` e `PlaylistItem` armazenam o nome do criador/autor como string simples (sem FK para tabela `User`)

### Fluxo de Identificação
1. Client (`Home.razor`): Usuário digita seu nome → salvo no `localStorage` via `AuthStateService.SetUsernameAsync()`
2. Client (`MainLayout`): Em `OnAfterRenderAsync`, lê nome do `localStorage` via `AuthStateService.InitializeAsync()`
3. Client (`ApiService`): Envia header `X-Username` em todas as chamadas HTTP
4. Client (`RoomHubService`): Conecta ao SignalR com `?username=` na URL
5. API (`RoomsController`): Lê `Request.Headers["X-Username"]` para identificar quem está criando/deletando salas
6. API (`RoomHub`): Lê `Context.GetHttpContext().Request.Query["username"]` para identificar o usuário na conexão

### Observações Importantes
- `localStorage` só funciona em `OnAfterRenderAsync` no Blazor WASM (não em `OnInitializedAsync`)
- `AuthStateService` é registrado como **Scoped** (depende de `IJSRuntime`)
- `ApiService` envia `X-Username` via `HttpClient.DefaultRequestHeaders` (remove e re-adiciona a cada chamada)
- `UseHttpsRedirection()` só é aplicado em `Development` — em produção o Traefik termina o TLS
- A tabela `Users` existe no banco mas **não é utilizada** atualmente — as entidades não possuem FK para ela

### Salas
- `POST /api/rooms` — Cria uma nova sala (requer `X-Username`)
- `GET /api/rooms` — Lista salas ativas (lobby)
- `GET /api/rooms/{hash}` — Detalhes de uma sala
- `POST /api/rooms/{hash}/join` — Entra na sala (com senha, se necessário)
- `DELETE /api/rooms/{hash}` — Deleta uma sala (requer `X-Username`, apenas o dono)

### Playlist
- `POST /api/rooms/{hash}/playlist` — Adiciona vídeo à playlist (requer `X-Username`)
- `POST /api/rooms/{hash}/playlist/from-url` — Adiciona vídeo(s) por URL do YouTube (requer `X-Username`)
- `DELETE /api/rooms/{hash}/playlist/{itemId}` — Remove vídeo da playlist
- `DELETE /api/rooms/{hash}/playlist` — Limpa toda a playlist
- `GET /api/rooms/{hash}/playlist` — Lista a playlist da sala

### SignalR Hub (`/hubs/room`)

**Conexão**: `{API_BASE_URL}/hubs/room?username={nome}` — username é passado como query string

**Métodos do servidor (Client → Server):**
- `JoinRoom(roomHash)` — Entra no grupo SignalR da sala
- `LeaveRoom(roomHash)` — Sai do grupo SignalR
- `SendPlayerAction(roomHash, action)` — Envia ação do player
- `SendChatMessage(roomHash, content)` — Envia mensagem no chat (username vem da query string)
- `AddToPlaylist(roomHash, request)` — Adiciona vídeo à playlist
- `SyncState(roomHash)` — Solicita estado atual da sala
- `JumpToVideo(roomHash, videoIndex)` — Pula para vídeo específico na playlist

**Eventos do cliente (Server → Client):**
- `ReceivePlayerAction(action)` — Recebe ação do player
- `ReceiveChatMessage(message)` — Recebe mensagem do chat
- `ReceiveRoomState(state)` — Recebe estado atual ao entrar
- `PlaylistUpdated(item)` — Novo item adicionado à playlist
- `PlaylistCleared` — Playlist foi limpa
- `UserJoined(userInfo)` — Usuário entrou na sala
- `UserLeft(userName)` — Usuário saiu da sala
- `ReceiveUserList(users)` — Lista atualizada de usuários online

## Modelo de Dados

### Entidades (sem FK para User)
As entidades `Room`, `ChatMessage` e `PlaylistItem` armazenam nomes de usuário como strings simples. A tabela `Users` existe no banco mas não é referenciada por nenhuma FK.

- **Room**: `Id`, `Hash`, `Name`, `PasswordHash?`, `OwnerName` (string), `IsActive`, `CurrentVideoIndex`, `CurrentTime`, `IsPlaying`, `UsersCount`, `CreatedAt`
- **ChatMessage**: `Id`, `RoomId` (FK→Room), `UserDisplayName` (string), `Content`, `SentAt`
- **PlaylistItem**: `Id`, `RoomId` (FK→Room), `VideoId`, `Title`, `ThumbnailUrl`, `Order`, `AddedByDisplayName` (string), `AddedAt`
- **User**: `Id`, `DiscordId`, `DiscordUsername`, `AvatarUrl`, `Nickname`, `CreatedAt`, `LastLoginAt` — **não utilizada atualmente**

## Changelog

- **v0.3.0** — Remoção completa de Discord OAuth2 e JWT. Autenticação substituída por nome de usuário salvo no localStorage. Entidades `Room`, `ChatMessage` e `PlaylistItem` desacopladas da tabela `User` — owner/autor armazenado como string simples (`OwnerName`, `UserDisplayName`, `AddedByDisplayName`). Removidos `AuthController`, `AuthService`, `IAuthService`, `AuthCallback.razor`. API identifica usuário via header `X-Username` (HTTP) e query string `?username=` (SignalR). Tabela `Users` mantida no banco mas sem uso ativo. Migration recriada do zero.
- **v0.2.0** — Infraestrutura de deploy: Docker multi-stage (API + Client), docker-compose com Traefik + PostgreSQL, `.env` como única fonte de verdade (removidos todos os segredos e URLs de `appsettings.json` e código), nginx para servir Blazor WASM, `client-entrypoint.sh` para injeção de config em runtime.
- **v0.1.0** — Estrutura inicial do monorepo, entidades de domínio, configuração DDD, SignalR Hub base, Blazor WASM scaffold.
