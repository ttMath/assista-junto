using System.Collections.Concurrent;
using System.Security.Claims;
using AssistaJunto.Application.DTOs;
using AssistaJunto.Application.Interfaces;
using AssistaJunto.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace AssistaJunto.API.Hubs;

[Authorize]
public class RoomHub : Hub
{
    private readonly IRoomService _roomService;
    private readonly IChatService _chatService;
    private readonly IPlaylistService _playlistService;
    private readonly IAuthService _authService;

    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, RoomUserInfo>> _roomUsers = new();
    private static readonly ConcurrentDictionary<string, string> _connectionRooms = new();
    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, int>> _roomUserCounts = new();

    public RoomHub(IRoomService roomService, IChatService chatService, IPlaylistService playlistService, IAuthService authService)
    {
        _roomService = roomService;
        _chatService = chatService;
        _playlistService = playlistService;
        _authService = authService;
    }

    public async Task JoinRoom(string roomHash)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, roomHash);

        var state = await _roomService.GetRoomStateAsync(roomHash);
        if (state is not null)
            await Clients.Caller.SendAsync("ReceiveRoomState", state);

        var userId = GetUserId();
        var user = await _authService.GetCurrentUserAsync(userId);
        var userInfo = new RoomUserInfo(
            user?.DisplayName ?? Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Anônimo",
            user?.AvatarUrl ?? ""
        );

        _connectionRooms[Context.ConnectionId] = roomHash;

        var users = _roomUsers.GetOrAdd(roomHash, _ => new ConcurrentDictionary<string, RoomUserInfo>());
        users[Context.ConnectionId] = userInfo;

        var userCounts = _roomUserCounts.GetOrAdd(roomHash, _ => new ConcurrentDictionary<string, int>());
        var userIdStr = userId.ToString();
        var newConnCount = userCounts.AddOrUpdate(userIdStr, 1, (_, old) => old + 1);
        if (newConnCount == 1)
        {
            try
            {
                await _roomService.IncrementUserCountAsync(roomHash);
            }
            catch
            {
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

        try
        {
            var userId = GetUserId();
            var userIdStr = userId.ToString();
            if (_roomUserCounts.TryGetValue(roomHash, out var userCounts))
            {
                if (userCounts.TryGetValue(userIdStr, out var connCount))
                {
                    if (connCount <= 1)
                    {
                        userCounts.TryRemove(userIdStr, out _);
                        try { await _roomService.DecrementUserCountAsync(roomHash); } catch { }
                    }
                    else
                    {
                        userCounts[userIdStr] = connCount - 1;
                    }

                    if (userCounts.IsEmpty)
                        _roomUserCounts.TryRemove(roomHash, out _);
                }
            }
        }
        catch
        {
        }

        var userName = userInfo?.DisplayName ?? Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Anônimo";
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

            try
            {
                var userId = GetUserId();
                var userIdStr = userId.ToString();
                if (_roomUserCounts.TryGetValue(roomHash, out var userCounts))
                {
                    if (userCounts.TryGetValue(userIdStr, out var connCount))
                    {
                        if (connCount <= 1)
                        {
                            userCounts.TryRemove(userIdStr, out _);
                            try { await _roomService.DecrementUserCountAsync(roomHash); } catch { }
                        }
                        else
                        {
                            userCounts[userIdStr] = connCount - 1;
                        }

                        if (userCounts.IsEmpty)
                            _roomUserCounts.TryRemove(roomHash, out _);
                    }
                }
            }
            catch
            {
            }

            var userName = userInfo?.DisplayName ?? "Anônimo";
            await Clients.OthersInGroup(roomHash).SendAsync("UserLeft", userName);

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
                    break;
                case PlayerAction.NextVideo:
                    await _roomService.NextVideoAsync(roomHash);
                    break;
                case PlayerAction.PreviousVideo:
                    await _roomService.PreviousVideoAsync(roomHash);
                    break;
            }

            await Clients.OthersInGroup(roomHash).SendAsync("ReceivePlayerAction", action);
        }
        catch (Exception ex)
        {
            throw new HubException($"Falha ao processar ação do player: {ex.Message}");
        }
    }

    public async Task SendChatMessage(string roomHash, string content)
    {
        try
        {
            var userId = GetUserId();
            var message = await _chatService.SendMessageAsync(roomHash, userId, content);
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
            var userId = GetUserId();
            var item = await _playlistService.AddToPlaylistAsync(roomHash, request, userId);
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

    private Guid GetUserId()
    {
        var claim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new HubException("Usuário não autenticado.");
        return Guid.Parse(claim);
    }
}
