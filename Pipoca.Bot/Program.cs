using NetCord.Hosting.Gateway;
using NetCord.Hosting.Services;
using NetCord.Hosting.Services.ApplicationCommands;
using Pipoca.Bot.Modules;

DotNetEnv.Env.TraversePath().Load();

var builder = Host.CreateApplicationBuilder(args);

builder.Services
    .AddDiscordGateway(options =>
    {
        options.Token = Environment.GetEnvironmentVariable("DISCORD_TOKEN");
    })
    .AddApplicationCommands();

var apiBase = Environment.GetEnvironmentVariable("API_BASE_URL") ?? "https://localhost:7045/";
if (!apiBase.EndsWith('/')) apiBase += "/";

builder.Services.AddHttpClient<Pipoca.Bot.Services.AssistaJuntoApiClient>(client =>
{
    client.BaseAddress = new Uri(apiBase);
});

var host = builder.Build();

host.AddModules(typeof(RoomModule).Assembly);

await host.RunAsync();
