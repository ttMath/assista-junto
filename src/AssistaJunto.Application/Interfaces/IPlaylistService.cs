using AssistaJunto.Application.DTOs;

namespace AssistaJunto.Application.Interfaces;

public interface IPlaylistService
{
    Task<PlaylistItemDto> AddToPlaylistAsync(string roomHash, AddToPlaylistRequest request, Guid userId);
    Task RemoveFromPlaylistAsync(string roomHash, Guid itemId);
    Task<List<PlaylistItemDto>> GetPlaylistAsync(string roomHash);
}
