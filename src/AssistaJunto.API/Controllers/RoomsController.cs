using AssistaJunto.Application.DTOs;
using AssistaJunto.Application.Interfaces;
using AssistaJunto.API.Hubs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;

namespace AssistaJunto.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("api-global")]
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
    [EnableRateLimiting("create-room")]
    public async Task<IActionResult> CreateRoom([FromBody] CreateRoomRequest request)
    {
        var username = GetUsername();
        if (username is null) return BadRequest("Header X-Username é obrigatório e deve ter no máximo 50 caracteres.");
        try
        {
            var room = await _roomService.CreateRoomAsync(request, username);
            return CreatedAtAction(nameof(GetRoom), new { hash = room.Hash }, room);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
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
    [EnableRateLimiting("playlist-write")]
    public async Task<IActionResult> AddToPlaylist(string hash, [FromBody] AddToPlaylistRequest request)
    {
        var username = GetUsername();
        if (username is null) return BadRequest("Header X-Username é obrigatório e deve ter no máximo 50 caracteres.");
        var item = await _playlistService.AddToPlaylistAsync(hash, request, username);
        return Ok(item);
    }

    [HttpPost("{hash}/playlist/from-url")]
    [EnableRateLimiting("playlist-write")]
    public async Task<IActionResult> AddPlaylistByUrl(string hash, [FromBody] AddPlaylistByUrlRequest request)
    {
        try
        {
            var username = GetUsername();
            if (username is null) return BadRequest("Header X-Username é obrigatório e deve ter no máximo 50 caracteres.");
            var result = await _playlistService.AddPlaylistByUrlAsync(hash, request, username);
            await BroadcastRoomStateAsync(hash, includeCurrentTime: false);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (HttpRequestException)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { message = "Não foi possível consultar o YouTube no momento." });
        }
    }

    [HttpPost("{hash}/playlist/reorder")]
    [EnableRateLimiting("playlist-write")]
    public async Task<IActionResult> ReorderPlaylist(string hash, [FromBody] ReorderPlaylistRequest request)
    {
        await _playlistService.ReorderPlaylistAsync(hash, request);
        await BroadcastRoomStateAsync(hash, includeCurrentTime: false);
        return NoContent();
    }

    [HttpDelete("{hash}/playlist/{itemId:guid}")]
    public async Task<IActionResult> RemoveFromPlaylist(string hash, Guid itemId)
    {
        await _playlistService.RemoveFromPlaylistAsync(hash, itemId);
        await BroadcastRoomStateAsync(hash, includeCurrentTime: false);
        return NoContent();
    }

    [HttpPost("{hash}/playlist/shuffle")]
    [EnableRateLimiting("playlist-write")]
    public async Task<IActionResult> ShufflePlaylist(string hash)
    {
        await _playlistService.ShufflePlaylistAsync(hash);
        await BroadcastRoomStateAsync(hash, includeCurrentTime: false);
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
        await BroadcastRoomStateAsync(hash, includeCurrentTime: false);
        return NoContent();
    }

    [HttpDelete("{hash}")]
    public async Task<IActionResult> DeleteRoom(string hash)
    {
        try
        {
            var username = GetUsername();
            if (username is null) return BadRequest("Header X-Username é obrigatório e deve ter no máximo 50 caracteres.");
            await _roomService.DeleteRoomAsync(hash, username);
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
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Erro ao processar a eliminação." });
        }
    }

    private string? GetUsername()
    {
        var raw = Request.Headers["X-Username"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(raw)) return null;

        string username;
        try
        {
            username = Uri.UnescapeDataString(raw).Trim();
        }
        catch
        {
            return null;
        }
        if (string.IsNullOrWhiteSpace(username)) return null;
        return username.Length > 50 ? null : username;
    }

    private async Task BroadcastRoomStateAsync(string hash, bool includeCurrentTime = true)
    {
        var state = await _roomService.GetRoomStateAsync(hash);
        if (state is not null)
        {
            var synchronizedState = includeCurrentTime
                ? state
                : state with { CurrentTime = 0 };

            await _hubContext.Clients.Group(hash).SendAsync("ReceiveRoomState", synchronizedState);
        }
    }
}
