using System.Security.Claims;
using AssistaJunto.Application.DTOs;
using AssistaJunto.Application.Interfaces;
using AssistaJunto.API.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace AssistaJunto.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class RoomsController : ControllerBase
{
    private readonly IRoomService _roomService;
    private readonly IPlaylistService _playlistService;
    private readonly IHubContext<RoomHub> _hubContext;

    public RoomsController(IRoomService roomService, IPlaylistService playlistService, IHubContext<RoomHub> hubContext)
    {
        _roomService = roomService;
        _playlistService = playlistService;
        _hubContext = hubContext;
    }

    [HttpPost]
    public async Task<IActionResult> CreateRoom([FromBody] CreateRoomRequest request)
    {
        var userId = GetUserId();
        var room = await _roomService.CreateRoomAsync(request, userId);
        return CreatedAtAction(nameof(GetRoom), new { hash = room.Hash }, room);
    }

    [HttpGet]
    public async Task<IActionResult> GetActiveRooms()
    {
        var rooms = await _roomService.GetActiveRoomsAsync();
        return Ok(rooms);
    }

    [HttpGet("{hash}")]
    public async Task<IActionResult> GetRoom(string hash)
    {
        var room = await _roomService.GetRoomByHashAsync(hash);
        return room is not null ? Ok(room) : NotFound();
    }

    [HttpPost("{hash}/join")]
    public async Task<IActionResult> JoinRoom(string hash, [FromBody] JoinRoomRequest request)
    {
        var allowed = await _roomService.JoinRoomAsync(hash, request.Password);
        if (!allowed) return Unauthorized("Senha incorreta ou sala não encontrada.");

        var state = await _roomService.GetRoomStateAsync(hash);
        return Ok(state);
    }

    [HttpPost("{hash}/playlist")]
    public async Task<IActionResult> AddToPlaylist(string hash, [FromBody] AddToPlaylistRequest request)
    {
        var userId = GetUserId();
        var item = await _playlistService.AddToPlaylistAsync(hash, request, userId);
        return Ok(item);
    }

    [HttpPost("{hash}/playlist/from-url")]
    public async Task<IActionResult> AddPlaylistByUrl(string hash, [FromBody] AddPlaylistByUrlRequest request)
    {
        var userId = GetUserId();
        var result = await _playlistService.AddPlaylistByUrlAsync(hash, request.Url, userId);

        foreach (var item in result.Items)
        {
            await _hubContext.Clients.Group(hash).SendAsync("PlaylistUpdated", item);
        }

        return Ok(result);
    }

    [HttpDelete("{hash}/playlist/{itemId:guid}")]
    public async Task<IActionResult> RemoveFromPlaylist(string hash, Guid itemId)
    {
        await _playlistService.RemoveFromPlaylistAsync(hash, itemId);
        return NoContent();
    }

    [HttpGet("{hash}/playlist")]
    public async Task<IActionResult> GetPlaylist(string hash)
    {
        var playlist = await _playlistService.GetPlaylistAsync(hash);
        return Ok(playlist);
    }

    [HttpDelete("{hash}/playlist")]
    public async Task<IActionResult> ClearPlaylist(string hash)
    {
        await _playlistService.ClearPlaylistAsync(hash);
        await _hubContext.Clients.Group(hash).SendAsync("PlaylistCleared");
        return NoContent();
    }

    [HttpDelete("{hash}")]
    public async Task<IActionResult> DeleteRoom(string hash)
    {
        try
        {
            var userId = GetUserId();
            await _roomService.DeleteRoomAsync(hash, userId);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Erro ao processar a eliminação." });
        }
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}
