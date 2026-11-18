<div align="center">
  <img src="https://img.shields.io/badge/.NET-10-purple?style=for-the-badge" alt=".NET 10">
  <img src="https://img.shields.io/badge/PostgreSQL-blue?style=for-the-badge" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Blazor-4c078c?style=for-the-badge" alt="Blazor">
  <img src="https://img.shields.io/badge/SignalR-lightgray?style=for-the-badge" alt="SignalR">
  <img src="https://img.shields.io/badge/EF%20Core-darkblue?style=for-the-badge" alt="EF Core">
  <img src="https://img.shields.io/badge/Bootstrap-magenta?style=for-the-badge" alt="Bootstrap">
  <br><br>
  <img src="https://i.imgur.com/wjX5t5x.png" alt="Discord, YouTube, and Group Synchronization" width="40%">

  # ASSISTA JUNTO - WATCH PARTY

  **Plataforma web para assistir vídeos do YouTube em grupo, com sincronização em tempo real e integração com Discord.**
</div>

---

## 🌐 Acesse

- **Domínio oficial:** [www.assistajunto.com.br](https://www.assistajunto.com.br)

---

## 🚀 Sobre o projeto

O `AssistaJunto` foi criado para oferecer uma experiência de watch party simples, gratuita e aberta. A proposta é permitir que grupos assistam ao mesmo conteúdo simultaneamente, com reprodução sincronizada e interação em tempo real.

Com identificação por apelido e integração com YouTube, a plataforma facilita criar salas, convidar pessoas e acompanhar o vídeo no mesmo timing. O bot Discord é uma integração separada; o frontend não utiliza OAuth ou JWT.

---

## ✨ Funcionalidades principais

- **Entrada por apelido** salvo no navegador.
- **Bot privado no Discord** para integração com o ecossistema da aplicação.
- **Sincronização em tempo real** de `Play`, `Pause` e `Seek` para todos na sala.
- **Playlist colaborativa** com links do YouTube (vídeos e playlists).
- **Chat em sala** para comunicação instantânea entre participantes.
- **Remoção automática de salas vazias e inativas** após **3 minutos sem atividade**.

---

## 🛠️ Stack tecnológica

| Camada | Tecnologia | Descrição |
| --- | --- | --- |
| Back-end | .NET 10 | API e serviços de aplicação |
| Front-end original | Blazor WebAssembly + Bootstrap | Preservado permanentemente e selecionado no compose original |
| Novo front-end | React + TypeScript + Vite + Sass | Implementação separada, com os mesmos contratos da API |
| Real-time | SignalR | Sincronização de player e chat em tempo real |
| Persistência | PostgreSQL | Banco de dados relacional |
| ORM | Entity Framework Core | Acesso e mapeamento de dados |

---

## 🧭 Como funciona

1. Usuário informa seu apelido.
2. Cria ou entra em uma sala.
3. Adiciona um link do YouTube na playlist.
4. A sala sincroniza a reprodução para todos os participantes.
5. Sem usuários e inativa por 3 minutos, a sala é removida automaticamente.

---

## 👥 Autores

| Nome | Função |
| --- | --- |
| [@MWillian](https://github.com/MWillian) | Full Stack Developer |
| [@ttMath](https://github.com/ttMath) | Full Stack Developer |

---

## 🛤️ Roadmap

- [ ] Infraestrutura em nuvem.
- [ ] Sistema de host (controle prioritário do dono da sala).
- [ ] Histórico de vídeos assistidos por sala.

## Desenvolvimento dos dois frontends

Pré-requisitos: .NET SDK 10, PostgreSQL para a API real e Node.js 26 LTS para React. Configure o `.env` a partir de `.env.example`. Não substitua um `.env` existente. O backend atual aplica migrations automaticamente ao iniciar; os testes da migração usam um host separado em memória e não executam esse bootstrap.

O Blazor permanece em `src/AssistaJunto.Client`, inclusive após a validação do React. Para uma instalação nova, copie `wwwroot/appsettings.Development.json.example` para `wwwroot/appsettings.Development.json` nesse projeto e ajuste a URL da API. Não sobrescreva uma configuração local existente.

```sh
# API: execute somente contra o banco de desenvolvimento configurado
dotnet run --project src/AssistaJunto.API --launch-profile https

# Blazor, em outro terminal: https://localhost:7036
dotnet run --project src/AssistaJunto.Client --launch-profile https

# React, em outro terminal: http://127.0.0.1:5173
npm --prefix src/AssistaJunto.React ci
npm --prefix src/AssistaJunto.React run dev
```

O Vite usa `API_BASE_URL` do `.env` na raiz para encaminhar `/api` e `/hubs` à API. Nenhum segredo do `.env` é exposto ao navegador. Os dois frontends podem executar simultaneamente. Como o armazenamento do navegador é isolado por origin, o apelido pode precisar ser informado em cada endereço.

Para executar o Vite com HTTPS local, encerre o Vite HTTP com `Ctrl+C` e execute:

```sh
npm --prefix src/AssistaJunto.React run dev:https
```

Acesso: **https://localhost:5173**. O comando reutiliza o certificado de desenvolvimento confiável do .NET e exporta os arquivos para `.certs/` no projeto React, ignorados no Git e no contexto Docker. Se o certificado ainda não estiver configurado na máquina, execute `dotnet dev-certs https --trust` uma vez e aceite a confirmação do sistema. A API e o proxy HTTP/SignalR mantêm a configuração existente. O comando `dev` continua oferecendo HTTP para desenvolvimento e para os testes automatizados.

```sh
# Tipos, lint, testes e build React
npm --prefix src/AssistaJunto.React run check

# Build .NET e publicação Blazor
dotnet build assistajunto.slnx -c Release
dotnet publish src/AssistaJunto.Client -c Release -o artifacts/blazor

# Publicação estática React: src/AssistaJunto.React/dist
npm --prefix src/AssistaJunto.React run build
```

## Testes de navegador sem banco de dados

Antes de executar, encerre o Vite de desenvolvimento com `Ctrl+C` e deixe as portas 5173 e 5199 livres. A suíte inicia seus próprios servidores e recusa reutilizar servidores existentes, para garantir que os testes não utilizem sua API real.

```sh
npm --prefix src/AssistaJunto.React exec -- playwright install chromium
npm --prefix src/AssistaJunto.React run test:e2e
```

Playwright inicia um host .NET exclusivamente em memória na porta 5199, publica uma cópia temporária do Blazor para comparação e inicia o Vite na porta 5173 com o proxy apontado para esse host. Não carrega `.env`, não aplica migrations, não usa PostgreSQL e não inicia o bot. Os testes determinísticos utilizam um player YouTube substituto, apenas nos testes. HTTP, hub, serviços de aplicação e entidades são reais. Para usar o Edge instalado no Windows, defina `$env:PLAYWRIGHT_CHANNEL = 'msedge'` antes de executar os testes.

Os três testes externos de reprodução/sincronização/importação YouTube são opcionais: no PowerShell, defina `$env:RUN_YOUTUBE_LIVE = '1'` para incluí-los em desktop. O comportamento de autoplay continua sujeito às políticas do navegador.

## Docker e escolha de frontend

O `docker-compose.yml` original continua utilizando o Blazor no serviço `client`. O React tem Dockerfile e compose adicionais, com porta própria e ativação explícita:

```sh
docker compose -f docker-compose.yml -f docker-compose.react.yml --profile react build react-client
# Utilizar a API existente, sem reiniciá-la ou iniciar suas dependências
docker compose -f docker-compose.yml -f docker-compose.react.yml --profile react up -d --no-deps react-client
```

Acesso React: http://127.0.0.1:3001. Configure `REACT_CLIENT_PORT` e `REACT_API_UPSTREAM` no `.env` se necessário. O nginx encaminha HTTP e WebSocket à mesma API e oferece fallback SPA. O serviço opcional não altera domínios Traefik nem faz a troca automática em produção.

Documentação: [inventário](MIGRATION_INVENTORY.md), [arquitetura](MIGRATION_ARCHITECTURE.md), [validação e pendências](MIGRATION_VALIDATION.md), [seleção e rollback](MIGRATION_ROLLBACK.md).

---
