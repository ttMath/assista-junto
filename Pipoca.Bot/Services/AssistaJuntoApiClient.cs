using System.Net.Http.Json;
using Pipoca.Bot.Models;

namespace Pipoca.Bot.Services;

public class AssistaJuntoApiClient
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private string _clientUrl { get; set; } = string.Empty;

    public AssistaJuntoApiClient(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _clientUrl = configuration["ClientUrl"] ?? Environment.GetEnvironmentVariable("ClientUrl") ?? "https://localhost:7036";
    }

    public async Task<RoomCreatedResult> CreateRoomAsync(CreateRoomRequest request, CancellationToken cancellationToken = default)
    {
        var client = _httpClient;
        client.DefaultRequestHeaders.Add("X-Username", "PipocaBot");
        var response = await client.PostAsJsonAsync("api/rooms", request, cancellationToken);

        if (response.IsSuccessStatusCode)
        {
            var dto = await response.Content.ReadFromJsonAsync<RoomDto>(cancellationToken: cancellationToken);
            if (dto is null)
                return new RoomCreatedResult(false, "Resposta inválida do servidor", null);
            dto.Url = $"{_clientUrl.TrimEnd('/')}/sala/{dto.Hash}";
            return new RoomCreatedResult(true, null, dto.Url);
        }

        var error = await response.Content.ReadAsStringAsync(cancellationToken);
        return new RoomCreatedResult(false, error, null);
    }

    public async Task<RoomsListResult> GetActiveRoomsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync("api/rooms", cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                var rooms = await response.Content.ReadFromJsonAsync<List<RoomInfo>>(cancellationToken: cancellationToken);
                if (rooms is null)
                {
                    return new RoomsListResult(false, new List<RoomInfo>(), "Resposta inválida do servidor");
                }
                foreach (var room in rooms)
                {
                    room.Url = $"{_clientUrl.TrimEnd('/')}/sala/{room.Hash}";
                }
                return new RoomsListResult(true, rooms ?? new List<RoomInfo>(), null);
            }
            var error = await response.Content.ReadAsStringAsync(cancellationToken);
            return new RoomsListResult(false, new List<RoomInfo>(), error);
        }
        catch (Exception ex)
        {
            return new RoomsListResult(false, new List<RoomInfo>(), ex.Message);
        }
    }

    public async Task<RoomDeleteResult> DeleteRoomAsync(string roomHash, CancellationToken cancellationToken = default)
    {
        try
        {
            _httpClient.DefaultRequestHeaders.Remove("X-Username");
            _httpClient.DefaultRequestHeaders.Add("X-Username", "PipocaBot");

            var response = await _httpClient.DeleteAsync($"api/rooms/{roomHash}", cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                return new RoomDeleteResult(true, null);
            }

            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                return new RoomDeleteResult(false, "Sala não encontrada.");

            if (response.StatusCode == System.Net.HttpStatusCode.Forbidden)
                return new RoomDeleteResult(false, "Apenas o dono da sala pode deletá-la.");

            var error = await response.Content.ReadAsStringAsync(cancellationToken);
            return new RoomDeleteResult(false, error);
        }
        catch (Exception ex)
        {
            return new RoomDeleteResult(false, ex.Message);
        }
    }

    public async Task<RoomDeleteByNameResult> DeleteRoomByNameAsync(string roomName, CancellationToken cancellationToken = default)
    {
        try
        {
            // Primeiro, busca a sala pelo nome
            var rooms = await GetActiveRoomsAsync(cancellationToken);
            if (!rooms.Success || rooms.Rooms.Count == 0)
                return new RoomDeleteByNameResult(false, null, "Nenhuma sala encontrada.");

            var room = rooms.Rooms.FirstOrDefault(r => string.Equals(r.Name, roomName, StringComparison.OrdinalIgnoreCase));
            if (room is null)
                return new RoomDeleteByNameResult(false, null, $"Sala '{roomName}' não encontrada.");

            // Agora deleta usando o hash
            var deleteResult = await DeleteRoomAsync(room.Hash, cancellationToken);

            if (deleteResult.Success)
                return new RoomDeleteByNameResult(true, room.Hash, null);

            return new RoomDeleteByNameResult(false, room.Hash, deleteResult.ErrorMessage);
        }
        catch (Exception ex)
        {
            return new RoomDeleteByNameResult(false, null, ex.Message);
        }
    }
}

public record RoomDeleteResult(bool Success, string? ErrorMessage);
public record RoomDeleteByNameResult(bool Success, string? RoomHash, string? ErrorMessage);