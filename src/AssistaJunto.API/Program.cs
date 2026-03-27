using AssistaJunto.API.Hubs;
using AssistaJunto.API.HostedServices;
using AssistaJunto.Application.Interfaces;
using AssistaJunto.Application.Services;
using AssistaJunto.Domain.Interfaces;
using AssistaJunto.Infrastructure.Data;
using AssistaJunto.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;

DotNetEnv.Env.TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

static string? NormalizeOrigin(string? origin)
{
    if (string.IsNullOrWhiteSpace(origin))
        return null;

    origin = origin.Trim().TrimEnd('/');

    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
        return null;

    var portPart = uri.IsDefaultPort ? string.Empty : $":{uri.Port}";
    return $"{uri.Scheme}://{uri.Host}{portPart}";
}

static IEnumerable<string> ExpandWwwVariants(string origin)
{
    yield return origin;

    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
        yield break;

    if (uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
        Uri.CheckHostName(uri.Host) == UriHostNameType.IPv4 ||
        Uri.CheckHostName(uri.Host) == UriHostNameType.IPv6)
        yield break;

    var alternativeHost = uri.Host.StartsWith("www.", StringComparison.OrdinalIgnoreCase)
        ? uri.Host[4..]
        : $"www.{uri.Host}";

    var portPart = uri.IsDefaultPort ? string.Empty : $":{uri.Port}";
    yield return $"{uri.Scheme}://{alternativeHost}{portPart}";
}

static List<string> BuildAllowedOrigins(IConfiguration configuration)
{
    var configuredOrigins = new List<string>();

    var clientUrl = configuration["ClientUrl"];
    if (!string.IsNullOrWhiteSpace(clientUrl))
        configuredOrigins.Add(clientUrl);

    var zeroTierClientUrl = configuration["ZeroTier:ClientUrl"];
    if (!string.IsNullOrWhiteSpace(zeroTierClientUrl))
        configuredOrigins.Add(zeroTierClientUrl);

    var extraOrigins = configuration["Cors:AllowedOrigins"];
    if (!string.IsNullOrWhiteSpace(extraOrigins))
    {
        configuredOrigins.AddRange(extraOrigins
            .Split([',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
    }

    var allowedOrigins = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    foreach (var configuredOrigin in configuredOrigins)
    {
        var normalized = NormalizeOrigin(configuredOrigin);
        if (normalized is null)
            continue;

        foreach (var expanded in ExpandWwwVariants(normalized))
            allowedOrigins.Add(expanded);
    }

    return [.. allowedOrigins];
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IRoomRepository, RoomRepository>();
builder.Services.AddScoped<IChatMessageRepository, ChatMessageRepository>();

builder.Services.AddScoped<IRoomService, RoomService>();
builder.Services.AddScoped<IPlaylistService, PlaylistService>();
builder.Services.AddScoped<IChatService, ChatService>();

builder.Services.AddHttpClient();

builder.Services.AddHostedService<InactiveRoomsCleanupService>();

builder.Services.AddControllers();
builder.Services.AddSignalR(options =>
{
    if (builder.Environment.IsDevelopment())
        options.EnableDetailedErrors = true;
});

var allowedOrigins = BuildAllowedOrigins(builder.Configuration);
if (allowedOrigins.Count == 0)
    throw new InvalidOperationException("No valid CORS origins configured. Set ClientUrl and/or Cors:AllowedOrigins.");

builder.Services.AddCors(options =>
{
    options.AddPolicy("BlazorClient", policy =>
    {
        policy.WithOrigins([.. allowedOrigins])
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        context.Database.Migrate();
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Ocorreu um erro ao aplicar as migrations no banco de dados.");
    }
}

if (app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseCors("BlazorClient");

app.MapControllers();
app.MapHub<RoomHub>("/hubs/room");

app.Run();
