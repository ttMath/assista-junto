# Seleção de frontend e rollback

O Blazor está preservado permanentemente em `src/AssistaJunto.Client`. A migração não altera a seleção de produção: o serviço `client` do compose original continua construindo `client.Dockerfile`. Não é necessário restaurar código do histórico Git.

## Desenvolvimento local

- Blazor: `dotnet run --project src/AssistaJunto.Client --launch-profile https` → https://localhost:7036.
- React: `npm --prefix src/AssistaJunto.React run dev` → http://127.0.0.1:5173.
- API compartilhada: utilize o ambiente .NET já configurado. O Vite lê `API_BASE_URL` do `.env` raiz e evita a necessidade de mudar CORS. O Blazor mantém sua configuração de desenvolvimento existente.

Para voltar ao Blazor, encerre apenas o processo Vite iniciado para React e utilize o endereço Blazor. As versões também podem continuar abertas simultaneamente. O localStorage é isolado por origin; em portas/domínios distintos pode ser necessário informar novamente o apelido.

## Docker

O arquivo `docker-compose.react.yml` acrescenta o serviço opcional `react-client` ao compose original e não modifica o serviço Blazor.

```sh
# Construir o React sem iniciar a stack/banco
docker compose -f docker-compose.yml -f docker-compose.react.yml --profile react build react-client

# Executar SOMENTE o React, usando a API que já está em execução
docker compose -f docker-compose.yml -f docker-compose.react.yml --profile react up -d --no-deps react-client

# Parar SOMENTE o frontend React
docker compose -f docker-compose.yml -f docker-compose.react.yml --profile react stop react-client
```

React fica em http://127.0.0.1:3001 por padrão, configurável por `REACT_CLIENT_PORT`. `REACT_API_UPSTREAM` deve alcançar a API pela rede Docker; o padrão é `http://api:5000`. Nenhum domínio de produção muda automaticamente.

## Caso seja autorizada uma troca de frontend em produção no futuro

1. Registrar as imagens/versões e regras atuais do proxy antes de alterar o tráfego.
2. Manter o container Blazor disponível e sua configuração de API válida.
3. Direcionar o proxy ao frontend escolhido apenas após validação e autorização de deploy.
4. Em regressão, redirecionar o mesmo domínio de volta ao serviço Blazor original. Não alterar endpoints da API, dados, volumes ou migrations.
5. Verificar home, `/sala/{hash}`, autenticação por apelido, chat e sincronização. Clientes podem precisar recarregar a página para trocar o bundle; conexões existentes encerram ao fechar/recarregar a página.

Não usar `down -v`, não recriar volumes e não executar migrations como parte do rollback do frontend. A inicialização normal da API atual aplica migrations automaticamente; por isso os comandos acima usam `--no-deps` para o serviço React.
