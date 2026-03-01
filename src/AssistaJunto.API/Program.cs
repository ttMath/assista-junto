using AssistaJunto.API.Hubs;
using AssistaJunto.Application.Interfaces;
using AssistaJunto.Application.Services;
using AssistaJunto.Domain.Interfaces;
using AssistaJunto.Infrastructure.Data;
using AssistaJunto.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;

DotNetEnv.Env.TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IRoomRepository, RoomRepository>();
builder.Services.AddScoped<IChatMessageRepository, ChatMessageRepository>();

builder.Services.AddScoped<IRoomService, RoomService>();
builder.Services.AddScoped<IPlaylistService, PlaylistService>();
builder.Services.AddScoped<IChatService, ChatService>();

builder.Services.AddHttpClient();

builder.Services.AddControllers();
builder.Services.AddSignalR(options =>
{
    if (builder.Environment.IsDevelopment())
        options.EnableDetailedErrors = true;
});

var clientUrl = builder.Configuration["ClientUrl"] ?? throw new InvalidOperationException("ClientUrl not configured. Set it in .env");
var allowedOrigins = new List<string> { clientUrl };
var zeroTierClientUrl = builder.Configuration["ZeroTier:ClientUrl"];
if (!string.IsNullOrWhiteSpace(zeroTierClientUrl))
    allowedOrigins.Add(zeroTierClientUrl);

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
