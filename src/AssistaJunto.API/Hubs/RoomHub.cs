using System.Collections.Concurrent;
using AssistaJunto.Application.DTOs;
using AssistaJunto.Application.Interfaces;
using AssistaJunto.Domain.Enums;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.SignalR;

namespace AssistaJunto.API.Hubs;

public class RoomHub : Hub
{
    private readonly IRoomService _roomService;
    private readonly IChatService _chatService;
    private readonly IPlaylistService _playlistService;
    private readonly ILogger<RoomHub> _logger;

    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, RoomUserInfo>> _roomUsers = new();
    private static readonly ConcurrentDictionary<string, string> _connectionRooms = new();
    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, int>> _roomUserCounts = new();
    private static readonly ConcurrentDictionary<string, ChatThrottleState> _chatThrottleStates = new();
    private const int ChatBurstLimit = 3;
    private const int ChatBurstWindowSeconds = 20;
    private const int ChatBlockSeconds = 60;

    public RoomHub(
        IRoomService roomService,
        IChatService chatService,
        IPlaylistService playlistService,
        ILogger<RoomHub> logger)
    {
        _roomService = roomService;
        _chatService = chatService;
        _playlistService = playlistService;
        _logger = logger;
    }

    public async Task JoinRoom(string roomHash)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, roomHash);

        var state = await _roomService.GetRoomStateAsync(roomHash);
        if (state is not null)
            await Clients.Caller.SendAsync("ReceiveRoomState", state);

        List<ChatMessageDto> recentMessages = [];
        try
        {
            recentMessages = await _chatService.GetRecentMessagesAsync(roomHash, 200);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Falha ao carregar histórico do chat para a sala {RoomHash}.", roomHash);
        }

        await Clients.Caller.SendAsync("ReceiveChatHistory", recentMessages);

        var username = GetUsername();
        var userInfo = new RoomUserInfo(username);

        _connectionRooms[Context.ConnectionId] = roomHash;

        var users = _roomUsers.GetOrAdd(roomHash, _ => new ConcurrentDictionary<string, RoomUserInfo>());
        users[Context.ConnectionId] = userInfo;

        var userCounts = _roomUserCounts.GetOrAdd(roomHash, _ => new ConcurrentDictionary<string, int>());
        var newConnCount = userCounts.AddOrUpdate(username, 1, (_, old) => old + 1);
        if (newConnCount == 1)
        {
            try
            {
                await _roomService.IncrementUserCountAsync(roomHash);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falha ao incrementar o total de usuários na sala {RoomHash}.", roomHash);
            }
        }

        var userList = users.Values.ToList();
        await Clients.Group(roomHash).SendAsync("ReceiveUserList", userList);
        await Clients.OthersInGroup(roomHash).SendAsync("UserJoined", userInfo);
    }

    public async Task LeaveRoom(string roomHash)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomHash);

        _connectionRooms.TryRemove(Context.ConnectionId, out _);

        RoomUserInfo? userInfo = null;
        if (_roomUsers.TryGetValue(roomHash, out var users))
        {
            users.TryRemove(Context.ConnectionId, out userInfo);
            if (users.IsEmpty)
                _roomUsers.TryRemove(roomHash, out _);
        }

        var username = GetUsername();
        if (_roomUserCounts.TryGetValue(roomHash, out var userCounts))
        {
            if (userCounts.TryGetValue(username, out var connCount))
            {
                if (connCount <= 1)
                {
                    userCounts.TryRemove(username, out _);
                    try
                    {
                        await _roomService.DecrementUserCountAsync(roomHash);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Falha ao decrementar o total de usuários ao sair da sala {RoomHash}.", roomHash);
                    }
                }
                else
                {
                    userCounts[username] = connCount - 1;
                }

                if (userCounts.IsEmpty)
                    _roomUserCounts.TryRemove(roomHash, out _);
            }
        }

        var userName = userInfo?.DisplayName ?? username;
        await Clients.OthersInGroup(roomHash).SendAsync("UserLeft", userName);

        var userList = users?.Values.ToList() ?? [];
        await Clients.Group(roomHash).SendAsync("ReceiveUserList", userList);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (_connectionRooms.TryRemove(Context.ConnectionId, out var roomHash))
        {
            RoomUserInfo? userInfo = null;
            if (_roomUsers.TryGetValue(roomHash, out var users))
            {
                users.TryRemove(Context.ConnectionId, out userInfo);
                if (users.IsEmpty)
                    _roomUsers.TryRemove(roomHash, out _);
            }

            var username = userInfo?.DisplayName ?? "Anônimo";
            if (_roomUserCounts.TryGetValue(roomHash, out var userCounts))
            {
                if (userCounts.TryGetValue(username, out var connCount))
                {
                    if (connCount <= 1)
                    {
                        userCounts.TryRemove(username, out _);
                        try
                        {
                            await _roomService.DecrementUserCountAsync(roomHash);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Falha ao decrementar o total de usuários na desconexão da sala {RoomHash}.", roomHash);
                        }
                    }
                    else
                    {
                        userCounts[username] = connCount - 1;
                    }

                    if (userCounts.IsEmpty)
                        _roomUserCounts.TryRemove(roomHash, out _);
                }
            }

            await Clients.OthersInGroup(roomHash).SendAsync("UserLeft", username);

            var userList = users?.Values.ToList() ?? [];
            await Clients.Group(roomHash).SendAsync("ReceiveUserList", userList);
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task SendPlayerAction(string roomHash, PlayerActionDto action)
    {
        try
        {
            switch (action.Action)
            {
                case PlayerAction.Play:
                    await _roomService.UpdatePlayerStateAsync(roomHash, action.SeekTime ?? 0, true);
                    break;
                case PlayerAction.Pause:
                    await _roomService.UpdatePlayerStateAsync(roomHash, action.SeekTime ?? 0, false);
                    break;
                case PlayerAction.SeekTo:
                    await _roomService.UpdatePlaybackProgressAsync(roomHash, action.SeekTime ?? 0, action.ExpectedIndex);
                    break;
                case PlayerAction.NextVideo:
                    await _roomService.NextVideoAsync(roomHash, action.ExpectedIndex);
                    break;
                case PlayerAction.PreviousVideo:
                    await _roomService.PreviousVideoAsync(roomHash, action.ExpectedIndex);
                    break;
            }

            await Clients.OthersInGroup(roomHash).SendAsync("ReceivePlayerAction", action);
        }
        catch (Exception ex)
        {
            throw new HubException($"Falha ao processar ação do player: {ex.Message}");
        }
    }

    public async Task ReportPlaybackProgress(string roomHash, double currentTime, int? expectedIndex)
    {
        await _roomService.UpdatePlaybackProgressAsync(roomHash, currentTime, expectedIndex);
    }

    public async Task SendChatMessage(string roomHash, string content)
    {
        try
        {
            var username = GetUsername();

            var (allowed, secondsRemaining) = ValidateChatThrottle(roomHash, username);
            if (!allowed)
            {
                await Clients.Caller.SendAsync("ChatBlocked", secondsRemaining, "Você enviou mensagens muito rápido. Aguarde para voltar a enviar.");
                return;
            }

            var message = await _chatService.SendMessageAsync(roomHash, username, content);
            await Clients.Group(roomHash).SendAsync("ReceiveChatMessage", message);
        }
        catch (Exception ex)
        {
            throw new HubException($"Falha ao enviar mensagem: {ex.Message}");
        }
    }

    public async Task AddToPlaylist(string roomHash, AddToPlaylistRequest request)
    {
        try
        {
            var username = GetUsername();
            var item = await _playlistService.AddToPlaylistAsync(roomHash, request, username);
            await Clients.Group(roomHash).SendAsync("PlaylistUpdated", item);
        }
        catch (Exception ex)
        {
            throw new HubException($"Falha ao adicionar à playlist: {ex.Message}");
        }
    }

    public async Task SyncState(string roomHash)
    {
        var state = await _roomService.GetRoomStateAsync(roomHash);
        if (state is not null)
            await Clients.Caller.SendAsync("ReceiveRoomState", state);
    }

    public async Task JumpToVideo(string roomHash, int videoIndex)
    {
        try
        {
            await _roomService.JumpToVideoAsync(roomHash, videoIndex);
            var state = await _roomService.GetRoomStateAsync(roomHash);
            if (state is not null)
                await Clients.Group(roomHash).SendAsync("ReceiveRoomState", state);
        }
        catch (Exception ex)
        {
            throw new HubException($"Falha ao pular para o vídeo: {ex.Message}");
        }
    }

    private string GetUsername()
    {
        var httpContext = Context.GetHttpContext();
        var username = httpContext?.Request.Query["username"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(username))
            return "Anônimo";

        username = username.Trim();
        if (username.Length > 50)
            throw new HubException("Nome de usuário deve ter no máximo 50 caracteres.");

        return username;
    }

    private static (bool Allowed, int SecondsRemaining) ValidateChatThrottle(string roomHash, string username)
    {
        var now = DateTime.UtcNow;
        var key = $"{roomHash}:{username.ToLowerInvariant()}";
        var state = _chatThrottleStates.GetOrAdd(key, _ => new ChatThrottleState());

        lock (state.Sync)
        {
            if (state.BlockedUntilUtc.HasValue && state.BlockedUntilUtc.Value > now)
            {
                var remaining = (int)Math.Ceiling((state.BlockedUntilUtc.Value - now).TotalSeconds);
                return (false, Math.Max(1, remaining));
            }

            if (state.BlockedUntilUtc.HasValue && state.BlockedUntilUtc.Value <= now)
                state.BlockedUntilUtc = null;

            var windowStart = now.AddSeconds(-ChatBurstWindowSeconds);
            while (state.MessageTimesUtc.Count > 0 && state.MessageTimesUtc.Peek() < windowStart)
                state.MessageTimesUtc.Dequeue();

            if (state.MessageTimesUtc.Count >= ChatBurstLimit)
            {
                state.BlockedUntilUtc = now.AddSeconds(ChatBlockSeconds);
                state.MessageTimesUtc.Clear();
                return (false, ChatBlockSeconds);
            }

            state.MessageTimesUtc.Enqueue(now);
            return (true, 0);
        }
    }

    private sealed class ChatThrottleState
    {
        public object Sync { get; } = new();
        public Queue<DateTime> MessageTimesUtc { get; } = new();
        public DateTime? BlockedUntilUtc { get; set; }
    }
}
