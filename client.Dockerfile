# === Build ===
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY src/AssistaJunto.Client/AssistaJunto.Client.csproj src/AssistaJunto.Client/
RUN dotnet restore src/AssistaJunto.Client/AssistaJunto.Client.csproj

COPY src/AssistaJunto.Client/ src/AssistaJunto.Client/
RUN dotnet publish src/AssistaJunto.Client/AssistaJunto.Client.csproj -c Release -o /app/publish --no-restore

# === Runtime - Nginx serve os arquivos estaticos do Blazor WASM ===
FROM nginx:alpine

COPY --from=build /app/publish/wwwroot /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/client-entrypoint.sh /docker-entrypoint.d/40-blazor-config.sh
RUN chmod +x /docker-entrypoint.d/40-blazor-config.sh

EXPOSE 3000
