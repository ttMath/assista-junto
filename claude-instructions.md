# Assista Junto — Guia de Instruções para IA

## Visão Geral

**Assista Junto** é uma plataforma web de consumo de mídia em grupo, exclusiva para membros do servidor Discord **JAÇA CITY**. Os usuários fazem login via Discord OAuth2, entram em um lobby e podem criar ou acessar salas de exibição sincronizada de vídeos do YouTube (estilo Watch2Gether).

## Estrutura do Monorepo

```
assistajunto/
├── claude-instructions.md          # Este arquivo
├── assistajunto.slnx               # Solução .NET
├── README.md
├── src/
│   ├── AssistaJunto.Domain/                # Camada de Domínio (DDD)
│   │   ├── Entities/                       # Entidades de domínio
│   │   ├── Enums/                          # Enumerações
│   │   └── Interfaces/                     # Contratos de repositório
│   │
│   ├── AssistaJunto.Application/           # Camada de Aplicação
│   │   ├── DTOs/                           # Data Transfer Objects
│   │   ├── Interfaces/                     # Contratos de serviço
│   │   └── Services/                       # Implementação dos serviços
│   │
│   ├── AssistaJunto.Infrastructure/        # Camada de Infraestrutura
│   │   ├── Data/                           # DbContext e Configurações EF Core
│   │   ├── Repositories/                   # Implementação dos repositórios
│   │   └── Migrations/                     # Migrations do EF Core
│   │   │
│   │   └── AssistaJunto.API/              # Camada de Apresentação (API)
│   │       ├── Controllers/               # Endpoints REST
│   │       ├── Hubs/                      # SignalR Hubs
│   │       └── Configuration/            # Configurações de DI, Auth, CORS
│   │
│   └── Frontend/
│       └── AssistaJunto.Client/           # Blazor WebAssembly
│           ├── Pages/                     # Páginas/Rotas
│           ├── Components/                # Componentes reutilizáveis
│           ├── Services/                  # Serviços do cliente (HTTP, SignalR)
│           ├── Models/                    # Modelos do lado cliente
│           └── wwwroot/                   # Assets estáticos + JS Interop
```

## Stack Tecnológico

| Camada         | Tecnologia                                   |
| -------------- | -------------------------------------------- |
| Framework      | .NET 10                                      |
| Frontend       | Blazor WebAssembly (WASM)                    |
| Backend        | ASP.NET Core Web API                         |
| Arquitetura    | Domain-Driven Design (DDD)                   |
| Tempo Real     | SignalR (WebSockets)                         |
| Banco de Dados | PostgreSQL                                   |
| ORM            | Entity Framework Core 10                     |
| Autenticação   | Discord OAuth2 + JWT                         |
| Player         | YouTube IFrame Player API via JSInterop      |

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
6. Client (AuthCallback.razor): Salva JWT no localStorage, carrega dados do user via `/api/auth/me`, redireciona para Home
7. Client (MainLayout): Em `OnAfterRenderAsync`, lê token do localStorage e carrega user se autenticado

### Observações Importantes
- `localStorage` só funciona em `OnAfterRenderAsync` no Blazor WASM (não em `OnInitializedAsync`)
- `AuthStateService` é registrado como **Scoped** (depende de `IJSRuntime`)
- `ApiService.SetAuth()` sempre sobrescreve o header Authorization (evita duplicação)

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

## Configurações de Ambiente

### appsettings.json (API)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=assistajunto;Username=postgres;Password=sua_senha"
  },
  "Discord": {
    "ClientId": "SEU_CLIENT_ID",
    "ClientSecret": "SEU_CLIENT_SECRET",
    "RedirectUri": "https://localhost:7001/api/auth/callback"
  },
  "Jwt": {
    "Secret": "CHAVE_SECRETA_MIN_32_CHARS_AQUI!!",
    "Issuer": "AssistaJunto",
    "Audience": "AssistaJuntoClient",
    "ExpirationInHours": 24
  }
}
```

### wwwroot/appsettings.json (Client)
```json
{
  "ApiBaseUrl": "https://localhost:7001"
}
```

## Changelog

- **v0.1.0** — Estrutura inicial do monorepo, entidades de domínio, configuração DDD, SignalR Hub base, Blazor WASM scaffold.
