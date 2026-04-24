using AssistaJunto.Client.Models;
using System.Net.Http.Json;

namespace AssistaJunto.Client.Services;

public class ApiService
{
    private readonly HttpClient _httpClient;
    private readonly AuthStateService _authState;

    public ApiService(HttpClient httpClient, AuthStateService authState)
    {
        _httpClient = httpClient;
        _authState = authState;
    }

    private void SetUsername()
    {
        _httpClient.DefaultRequestHeaders.Remove("X-Username");
        var username = _authState.Username;
        if (!string.IsNullOrWhiteSpace(username))
            _httpClient.DefaultRequestHeaders.Add("X-Username", Uri.EscapeDataString(username));
    }

    public async Task<List<RoomModel>> GetActiveRoomsAsync()
    {
        SetUsername();
        return await _httpClient.GetFromJsonAsync<List<RoomModel>>("api/rooms") ?? [];
    }

    public async Task<RoomModel?> CreateRoomAsync(CreateRoomModel model)
    {
        SetUsername();
        var response = await _httpClient.PostAsJsonAsync("api/rooms", model);
        if (!response.IsSuccessStatusCode)
        {
            var message = await TryGetErrorMessageAsync(response);
            if (!string.IsNullOrWhiteSpace(message))
                throw new InvalidOperationException(message);
        }
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<RoomModel>();
    }

    private static async Task<string?> TryGetErrorMessageAsync(HttpResponseMessage response)
    {
        try
        {
            var error = await response.Content.ReadFromJsonAsync<ApiErrorResponse>();
            return error?.Message;
        }
        catch
        {
            return null;
        }
    }

    private sealed class ApiErrorResponse
    {
        public string? Message { get; set; }
    }

    public async Task<RoomModel?> GetRoomAsync(string hash)
    {
        SetUsername();
        return await _httpClient.GetFromJsonAsync<RoomModel>($"api/rooms/{hash}");
    }

    public async Task<RoomStateModel?> JoinRoomAsync(string hash, string? password)
    {
        SetUsername();
        var response = await _httpClient.PostAsJsonAsync($"api/rooms/{hash}/join", new JoinRoomModel { Password = password });
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<RoomStateModel>();
    }

    public async Task<PlaylistItemModel?> AddToPlaylistAsync(string hash, AddToPlaylistModel model)
    {
        SetUsername();
        var response = await _httpClient.PostAsJsonAsync($"api/rooms/{hash}/playlist", model);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<PlaylistItemModel>();
    }

    public async Task ReorderPlaylistItemAsync(string hash, Guid itemId, int targetIndex)
    {
        SetUsername();
        var response = await _httpClient.PostAsJsonAsync($"api/rooms/{hash}/playlist/reorder", new ReorderPlaylistRequestModel
        {
            ItemId = itemId,
            TargetIndex = targetIndex
        });
        response.EnsureSuccessStatusCode();
    }

    public async Task RemoveFromPlaylistAsync(string hash, Guid itemId)
    {
        SetUsername();
        await _httpClient.DeleteAsync($"api/rooms/{hash}/playlist/{itemId}");
    }

    public async Task ClearPlaylistAsync(string hash)
    {
        SetUsername();
        await _httpClient.DeleteAsync($"api/rooms/{hash}/playlist");
    }

    public async Task<AddPlaylistByUrlResponseModel?> AddPlaylistByUrlAsync(string hash, AddPlaylistByUrlRequestModel model)
    {
        SetUsername();
        var response = await _httpClient.PostAsJsonAsync($"api/rooms/{hash}/playlist/from-url", model);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<AddPlaylistByUrlResponseModel>();
    }

    public async Task ShufflePlaylistAsync(string hash)
    {
        SetUsername();
        var response = await _httpClient.PostAsync($"api/rooms/{hash}/playlist/shuffle", null);
        response.EnsureSuccessStatusCode();
    }

    public async Task<bool> DeleteRoomAsync(string hash)
    {
        SetUsername();
        var response = await _httpClient.DeleteAsync($"api/rooms/{hash}");
        return response.IsSuccessStatusCode;
    }
}
