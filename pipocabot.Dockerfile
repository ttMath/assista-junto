FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Pipoca.Bot/Pipoca.Bot.csproj Pipoca.Bot/
RUN dotnet restore Pipoca.Bot/Pipoca.Bot.csproj

COPY Pipoca.Bot/ Pipoca.Bot/
RUN dotnet publish Pipoca.Bot/Pipoca.Bot.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/runtime:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Pipoca.Bot.dll"]
