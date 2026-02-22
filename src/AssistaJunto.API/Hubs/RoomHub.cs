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

    public RoomHub(IRoomService roomService, IChatService chatService, IPlaylistService playlistService)
    {
        _roomService = roomService;
        _chatService = chatService;
        _playlistService = playlistService;
    }

    public async Task JoinRoom(string roomHash)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, roomHash);

        var state = await _roomService.GetRoomStateAsync(roomHash);
        if (state is not null)
            await Clients.Caller.SendAsync("ReceiveRoomState", state);

        var userName = Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Anônimo";
        await Clients.OthersInGroup(roomHash).SendAsync("UserJoined", userName);
    }

    public async Task LeaveRoom(string roomHash)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomHash);

        var userName = Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Anônimo";
        await Clients.OthersInGroup(roomHash).SendAsync("UserLeft", userName);
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

    private Guid GetUserId()
    {
        var claim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new HubException("Usuário não autenticado.");
        return Guid.Parse(claim);
    }
}
