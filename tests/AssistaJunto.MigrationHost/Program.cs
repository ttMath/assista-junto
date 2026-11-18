using System.Collections.Concurrent;
using AssistaJunto.API.Hubs;
using AssistaJunto.Application.DTOs;
using AssistaJunto.Application.Interfaces;
using AssistaJunto.Application.Services;
using AssistaJunto.Domain.Entities;
using AssistaJunto.Domain.Interfaces;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.FileProviders;
using Microsoft.AspNetCore.StaticFiles;
using System.Threading.RateLimiting;

// Test-only loopback host. No EF, database, migrations, bot, cleanup service or .env.
var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://127.0.0.1:5199");
builder.Services.AddSingleton<IRoomRepository, MemoryRooms>();
builder.Services.AddSingleton<IChatMessageRepository, MemoryChat>();
builder.Services.AddScoped<IRoomService, RoomService>();
builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddScoped<IPlaylistService, PlaylistService>();
builder.Services.AddHttpClient();
builder.Services.AddControllers();
builder.Services.AddSignalR(options => options.EnableDetailedErrors = true);
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .WithOrigins("http://127.0.0.1:5173", "http://127.0.0.1:4173", "http://localhost:5173", "http://127.0.0.1:5199")
    .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
builder.Services.AddRateLimiter(options =>
{
    foreach (var name in new[] { "api-global", "create-room", "playlist-write" })
        options.AddPolicy(name, _ => RateLimitPartition.GetNoLimiter("migration-tests"));
});
var app = builder.Build();
app.UseCors();
app.UseRateLimiter();
app.MapControllers();
app.MapHub<RoomHub>("/hubs/room");
app.MapGet("/__test/health", () => Results.Ok(new { mode = "memory-only" }));
app.MapPost("/__test/seed", async (SeedRequest request, IRoomService service, IRoomRepository rooms) =>
{
    var dto = await service.CreateRoomAsync(new CreateRoomRequest(request.Name, request.Password), request.Owner);
    var room = (await rooms.GetByHashAsync(dto.Hash))!;
    foreach (var (id, title) in new[] { ("M7lc1UVf-VE", "Vídeo de demonstração"), ("aqz-KE-bpKQ", "Big Buck Bunny"), ("ScMzIvxBSi4", "Terceiro vídeo") })
        room.AddToPlaylist(id, title, "/favicon.png", request.Owner);
    room.UpdatePlayerState(0, 35, false);
    await rooms.UpdateAsync(room);
    return Results.Ok(await service.GetRoomByHashAsync(dto.Hash));
});

// Optional published Blazor bundle for cross-framework/browser regression tests.
var blazorPath = Environment.GetEnvironmentVariable("MIGRATION_BLAZOR_WWWROOT");
if (!string.IsNullOrWhiteSpace(blazorPath))
{
    var root = Path.GetFullPath(blazorPath);
    if (!File.Exists(Path.Combine(root, "index.html"))) throw new InvalidOperationException("Missing published Blazor index.html.");
    app.MapGet("/appsettings.json", () => Results.Json(new { ApiBaseUrl = "http://127.0.0.1:5199" }));
    app.MapGet("/appsettings.Development.json", () => Results.Json(new { ApiBaseUrl = "http://127.0.0.1:5199" }));
    var contentTypes = new FileExtensionContentTypeProvider();
    contentTypes.Mappings[".dat"] = "application/octet-stream";
    contentTypes.Mappings[".wasm"] = "application/wasm";
    app.UseStaticFiles(new StaticFileOptions { FileProvider = new PhysicalFileProvider(root), ContentTypeProvider = contentTypes });
    app.MapFallback(async context =>
    {
        if (context.Request.Path.StartsWithSegments("/api") || context.Request.Path.StartsWithSegments("/hubs") || context.Request.Path.StartsWithSegments("/__test"))
        { context.Response.StatusCode = 404; return; }
        context.Response.ContentType = "text/html";
        await context.Response.SendFileAsync(Path.Combine(root, "index.html"));
    });
}
app.Run();

record SeedRequest(string Name, string Owner, string? Password);
sealed class MemoryRooms : IRoomRepository
{
    private readonly ConcurrentDictionary<Guid, Room> rooms = new();
    public Task<Room?> GetByIdAsync(Guid id) => Task.FromResult(rooms.GetValueOrDefault(id));
    public Task<Room?> GetByHashAsync(string hash) => Task.FromResult(rooms.Values.FirstOrDefault(room => room.Hash == hash));
    public Task<List<Room>> GetActiveRoomsAsync() => Task.FromResult(rooms.Values.Where(room => room.IsActive).ToList());
    public Task AddAsync(Room room) { rooms[room.Id] = room; return Task.CompletedTask; }
    public Task UpdateAsync(Room room)
    {
        // EF assigns generated GUIDs on SaveChanges; reproduce only that persistence behavior.
        foreach (var item in room.Playlist.Where(item => item.Id == Guid.Empty))
            typeof(PlaylistItem).GetProperty(nameof(PlaylistItem.Id))!.SetValue(item, Guid.NewGuid());
        rooms[room.Id] = room;
        return Task.CompletedTask;
    }
    public Task DeleteAsync(Room room) { rooms.TryRemove(room.Id, out _); return Task.CompletedTask; }
}
sealed class MemoryChat : IChatMessageRepository
{
    private readonly ConcurrentBag<ChatMessage> messages = [];
    public Task<List<ChatMessage>> GetByRoomIdAsync(Guid roomId, int take = 50) => Task.FromResult(messages
        .Where(message => message.RoomId == roomId).OrderByDescending(message => message.SentAt).Take(take).OrderBy(message => message.SentAt).ToList());
    public Task AddAsync(ChatMessage message) { messages.Add(message); return Task.CompletedTask; }
}
