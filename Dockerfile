FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY src/AssistaJunto.Domain/AssistaJunto.Domain.csproj             src/AssistaJunto.Domain/
COPY src/AssistaJunto.Application/AssistaJunto.Application.csproj   src/AssistaJunto.Application/
COPY src/AssistaJunto.Infrastructure/AssistaJunto.Infrastructure.csproj src/AssistaJunto.Infrastructure/
COPY src/AssistaJunto.API/AssistaJunto.API.csproj                    src/AssistaJunto.API/
RUN dotnet restore src/AssistaJunto.API/AssistaJunto.API.csproj

COPY src/AssistaJunto.Domain/       src/AssistaJunto.Domain/
COPY src/AssistaJunto.Application/  src/AssistaJunto.Application/
COPY src/AssistaJunto.Infrastructure/ src/AssistaJunto.Infrastructure/
COPY src/AssistaJunto.API/          src/AssistaJunto.API/
RUN dotnet publish src/AssistaJunto.API/AssistaJunto.API.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 5000
ENTRYPOINT ["dotnet", "AssistaJunto.API.dll"]
