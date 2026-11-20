# Seleção de frontend e rollback

O Blazor está preservado permanentemente em `src/AssistaJunto.Client`, com seu `client.Dockerfile`. Conforme solicitado em 20/11/2026, a configuração de produção seleciona **React**: o serviço `client` do `docker-compose.yml` constrói `react-client.Dockerfile` e mantém as rotas Traefik já existentes. Não é necessário restaurar código do histórico Git para alternar os frontends.

## Desenvolvimento local

- Blazor: `dotnet run --project src/AssistaJunto.Client --launch-profile https` → https://localhost:7036.
- React: `npm --prefix src/AssistaJunto.React run dev` → http://127.0.0.1:5173.
- API compartilhada: utilize o ambiente .NET já configurado. O Vite lê `API_BASE_URL` do `.env` raiz e evita a necessidade de mudar CORS. O Blazor mantém sua configuração de desenvolvimento existente.

Para voltar ao Blazor, encerre apenas o processo Vite iniciado para React e utilize o endereço Blazor. As versões também podem continuar abertas simultaneamente. O localStorage é isolado por origin; em portas/domínios distintos pode ser necessário informar novamente o apelido.

## Aplicar React em produção

No servidor, após atualizar os arquivos do repositório e com a API já em execução:

```sh
docker compose -f docker-compose.yml config --quiet
docker compose -f docker-compose.yml build client
docker compose -f docker-compose.yml up -d --no-deps client
```

Esses comandos substituem somente o frontend do domínio `www.assistajunto.com.br`. O redirecionamento do domínio sem `www` e o certificado permanecem iguais. Não iniciam nem reiniciam API, bot ou PostgreSQL. Para uma instalação nova da stack inteira, o comando padrão continua sendo `docker compose -f docker-compose.yml up -d --build`.

O workflow `Pipeline.yml` utiliza o Compose principal no deploy de pushes em `main`. A branch de trabalho atual precisa ser incorporada à `main` para esse fluxo automático publicar as alterações. Não houve push ou deploy remoto a partir desta configuração local.

## Retornar ao Blazor no mesmo domínio

```sh
docker compose -f docker-compose.yml -f docker-compose.blazor.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.blazor.yml build client
docker compose -f docker-compose.yml -f docker-compose.blazor.yml up -d --no-deps client
```

O override troca somente o Dockerfile do serviço `client` e recupera as variáveis utilizadas pelo entrypoint Blazor. O React não recebe o `.env` completo, apenas `REACT_API_UPSTREAM`. Nenhuma segunda rota para o mesmo domínio é criada. Para voltar ao React, use novamente os comandos da seção anterior, sem o override Blazor.

Uma seleção manual pelo override vale até o próximo deploy padrão, que volta a aplicar React. Para manter Blazor entre deploys, a seleção do pipeline também precisaria ser ajustada.

## Preview React adicional

O arquivo `docker-compose.react.yml` acrescenta o serviço opcional `react-client`. O serviço de produção `client` já é React; esse preview usa uma porta local e fica fora do Traefik para não duplicar as rotas públicas.

```sh
# Construir o React sem iniciar a stack/banco
docker compose -f docker-compose.yml -f docker-compose.react.yml --profile react build react-client

# Executar SOMENTE o React, usando a API que já está em execução
docker compose -f docker-compose.yml -f docker-compose.react.yml --profile react up -d --no-deps react-client

# Parar SOMENTE o frontend React
docker compose -f docker-compose.yml -f docker-compose.react.yml --profile react stop react-client
```

React fica em http://127.0.0.1:3001 por padrão, configurável por `REACT_CLIENT_PORT`. `REACT_API_UPSTREAM` deve alcançar a API pela rede Docker; o padrão é `http://api:5000`. Nenhum domínio de produção muda automaticamente.

## Verificação após a troca

1. Verificar Home e acesso direto a `/sala/{hash}` em `https://www.assistajunto.com.br`.
2. Verificar criação/entrada, apelido, chat, fila e reprodução sincronizada entre dois clientes.
3. Confirmar a conexão WebSocket em `/hubs/room` e o funcionamento das chamadas `/api` pelo mesmo origin.
4. Em regressão, aplicar o override Blazor acima sem alterar endpoints, banco ou volumes. Clientes podem precisar recarregar a página para trocar o bundle; conexões existentes encerram ao fechar/recarregar a página.

Não usar `down -v`, não recriar volumes e não executar migrations como parte da troca ou rollback do frontend. A inicialização normal da API atual aplica migrations automaticamente; por isso os comandos específicos de frontend acima usam `--no-deps client`.
