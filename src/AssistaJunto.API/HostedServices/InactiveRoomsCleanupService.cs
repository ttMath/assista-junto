using AssistaJunto.Domain.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AssistaJunto.API.HostedServices;

public class InactiveRoomsCleanupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<InactiveRoomsCleanupService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1);
    private readonly int _inactiveMinutes = 3; 

    public InactiveRoomsCleanupService(IServiceProvider serviceProvider, ILogger<InactiveRoomsCleanupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation($"InactiveRoomsCleanupService iniciado. Verificando salas inativas a cada {_checkInterval.TotalMinutes} minuto(s).");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupInactiveRoomsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao limpar salas inativas.");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }

        _logger.LogInformation("InactiveRoomsCleanupService parado.");
    }

    private async Task CleanupInactiveRoomsAsync(CancellationToken cancellationToken)
    {
        using (var scope = _serviceProvider.CreateScope())
        {
            var roomRepository = scope.ServiceProvider.GetRequiredService<IRoomRepository>();

            var activeRooms = await roomRepository.GetActiveRoomsAsync();

            var roomsToDelete = activeRooms
                .Where(r => r.IsInactiveFor(_inactiveMinutes))
                .ToList();

            foreach (var room in roomsToDelete)
            {
                try
                {
                    var freshRoom = await roomRepository.GetByHashAsync(room.Hash);
                    if (freshRoom != null && freshRoom.IsInactiveFor(_inactiveMinutes))
                    {
                        await roomRepository.DeleteAsync(freshRoom);
                        _logger.LogInformation($"Sala inativa removida: {freshRoom.Hash} ({freshRoom.Name}) - Sem atividade há mais de {_inactiveMinutes} minutos.");
                    }
                    else if (freshRoom != null)
                    {
                        _logger.LogInformation($"Sala {room.Hash} não foi deletada - atividade detectada durante verificação.");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Erro ao deletar sala inativa {room.Hash}.");
                }
            }
        }
    }
}
