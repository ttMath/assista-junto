using System.Net.Http.Headers;
using System.Net.Http.Json;
using AssistaJunto.Client.Models;

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

    private void SetAuth()
    {
        if (_authState.Token is not null)
            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", _authState.Token);
        else
            _httpClient.DefaultRequestHeaders.Authorization = null;
    }

    public async Task<UserModel?> GetCurrentUserAsync()
    {
        SetAuth();
        var response = await _httpClient.GetAsync("api/auth/me");
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<UserModel>();
    }

    public async Task<UserModel?> UpdateNicknameAsync(string? nickname)
    {
        SetAuth();
        var response = await _httpClient.PutAsJsonAsync("api/auth/nickname", new { Nickname = nickname });
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<UserModel>();
    }

    public async Task<List<RoomModel>> GetActiveRoomsAsync()
    {
        SetAuth();
        return await _httpClient.GetFromJsonAsync<List<RoomModel>>("api/rooms") ?? [];
    }

    public async Task<RoomModel?> CreateRoomAsync(CreateRoomModel model)
    {
        SetAuth();
        var response = await _httpClient.PostAsJsonAsync("api/rooms", model);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<RoomModel>();
    }

    public async Task<RoomModel?> GetRoomAsync(string hash)
    {
        SetAuth();
        return await _httpClient.GetFromJsonAsync<RoomModel>($"api/rooms/{hash}");
    }

    public async Task<RoomStateModel?> JoinRoomAsync(string hash, string? password)
    {
        SetAuth();
        var response = await _httpClient.PostAsJsonAsync($"api/rooms/{hash}/join", new JoinRoomModel { Password = password });
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<RoomStateModel>();
    }

    public async Task<PlaylistItemModel?> AddToPlaylistAsync(string hash, AddToPlaylistModel model)
    {
        SetAuth();
        var response = await _httpClient.PostAsJsonAsync($"api/rooms/{hash}/playlist", model);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<PlaylistItemModel>();
    }

    public async Task RemoveFromPlaylistAsync(string hash, Guid itemId)
    {
        SetAuth();
        await _httpClient.DeleteAsync($"api/rooms/{hash}/playlist/{itemId}");
    }

    public async Task ClearPlaylistAsync(string hash)
    {
        SetAuth();
        await _httpClient.DeleteAsync($"api/rooms/{hash}/playlist");
    }

    public async Task<AddPlaylistByUrlResponseModel?> AddPlaylistByUrlAsync(string hash, string url)
    {
        SetAuth();
        var response = await _httpClient.PostAsJsonAsync($"api/rooms/{hash}/playlist/from-url", new { Url = url });
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<AddPlaylistByUrlResponseModel>();
    }
}
