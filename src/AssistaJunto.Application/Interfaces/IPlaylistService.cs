using AssistaJunto.Application.DTOs;

namespace AssistaJunto.Application.Interfaces;

public interface IPlaylistService
{
    Task<PlaylistItemDto> AddToPlaylistAsync(string roomHash, AddToPlaylistRequest request, string username);
    Task<AddPlaylistByUrlResponse> AddPlaylistByUrlAsync(string roomHash, string url, string username);
    Task RemoveFromPlaylistAsync(string roomHash, Guid itemId);
    Task ClearPlaylistAsync(string roomHash);
    Task<List<PlaylistItemDto>> GetPlaylistAsync(string roomHash);
}
