using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;

namespace AssistaJunto.Tests;

// Actual controllers, hub, services and domain; isolated repositories, no .env or EF startup.
public sealed class ApiFactory : WebApplicationFactory<global::Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder) =>
        builder.UseEnvironment("Testing").UseContentRoot(AppContext.BaseDirectory);

    public HubConnection CreateHub(string username) => new HubConnectionBuilder()
        .WithUrl($"http://localhost/hubs/room?username={Uri.EscapeDataString(username)}", options =>
        {
            options.Transports = HttpTransportType.LongPolling;
            options.HttpMessageHandlerFactory = _ => Server.CreateHandler();
        }).Build();
}
