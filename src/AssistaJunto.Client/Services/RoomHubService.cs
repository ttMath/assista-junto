using AssistaJunto.Client.Models;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.Configuration;

namespace AssistaJunto.Client.Services;

public class RoomHubService : IAsyncDisposable
{
    private HubConnection? _hubConnection;
    private readonly AuthStateService _authState;
    private readonly string _apiBaseUrl;

    public event Action<RoomStateModel>? OnRoomStateReceived;
    public event Action<PlayerActionModel>? OnPlayerActionReceived;
    public event Action<ChatMessageModel>? OnChatMessageReceived;
    public event Action<PlaylistItemModel>? OnPlaylistUpdated;
    public event Action? OnPlaylistCleared;
    public event Action<RoomUserModel>? OnUserJoined;
    public event Action<string>? OnUserLeft;
    public event Action<List<RoomUserModel>>? OnUserListReceived;

    public bool IsConnected => _hubConnection?.State == HubConnectionState.Connected;

    public RoomHubService(AuthStateService authState, IConfiguration configuration)
    {
        _authState = authState;
        _apiBaseUrl = configuration["ApiBaseUrl"] ?? "https://localhost:7045";
    }

    public async Task ConnectAsync()
    {
        if (_hubConnection is not null) return;

        var username = Uri.EscapeDataString(_authState.Username ?? "Anônimo");

        _hubConnection = new HubConnectionBuilder()
            .WithUrl($"{_apiBaseUrl}/hubs/room?username={username}")
            .WithAutomaticReconnect()
            .Build();

        _hubConnection.On<RoomStateModel>("ReceiveRoomState", state =>
            OnRoomStateReceived?.Invoke(state));

        _hubConnection.On<PlayerActionModel>("ReceivePlayerAction", action =>
            OnPlayerActionReceived?.Invoke(action));

        _hubConnection.On<ChatMessageModel>("ReceiveChatMessage", message =>
            OnChatMessageReceived?.Invoke(message));

        _hubConnection.On<PlaylistItemModel>("PlaylistUpdated", item =>
            OnPlaylistUpdated?.Invoke(item));

        _hubConnection.On("PlaylistCleared", () =>
            OnPlaylistCleared?.Invoke());

        _hubConnection.On<RoomUserModel>("UserJoined", user =>
            OnUserJoined?.Invoke(user));

        _hubConnection.On<string>("UserLeft", userName =>
            OnUserLeft?.Invoke(userName));

        _hubConnection.On<List<RoomUserModel>>("ReceiveUserList", users =>
            OnUserListReceived?.Invoke(users));

        await _hubConnection.StartAsync();
    }

    public async Task JoinRoomAsync(string roomHash)
    {
        if (_hubConnection is not null)
            await _hubConnection.InvokeAsync("JoinRoom", roomHash);
    }

    public async Task LeaveRoomAsync(string roomHash)
    {
        if (_hubConnection is not null)
            await _hubConnection.InvokeAsync("LeaveRoom", roomHash);
    }

    public async Task SendPlayerActionAsync(string roomHash, PlayerActionModel action)
    {
        if (_hubConnection is not null)
            await _hubConnection.InvokeAsync("SendPlayerAction", roomHash, action);
    }

    public async Task SendChatMessageAsync(string roomHash, string content)
    {
        if (_hubConnection is not null)
            await _hubConnection.InvokeAsync("SendChatMessage", roomHash, content);
    }

    public async Task AddToPlaylistAsync(string roomHash, AddToPlaylistModel model)
    {
        if (_hubConnection is not null)
            await _hubConnection.InvokeAsync("AddToPlaylist", roomHash, model);
    }

    public async Task SyncStateAsync(string roomHash)
    {
        if (_hubConnection is not null)
            await _hubConnection.InvokeAsync("SyncState", roomHash);
    }

    public async Task JumpToVideoAsync(string roomHash, int videoIndex)
    {
        if (_hubConnection is not null)
            await _hubConnection.InvokeAsync("JumpToVideo", roomHash, videoIndex);
    }

    public async ValueTask DisposeAsync()
    {
        if (_hubConnection is not null)
        {
            await _hubConnection.DisposeAsync();
            _hubConnection = null;
        }
    }
}
