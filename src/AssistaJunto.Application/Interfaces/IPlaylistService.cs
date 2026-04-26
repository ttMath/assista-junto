using AssistaJunto.Application.DTOs;

namespace AssistaJunto.Application.Interfaces;

public interface IPlaylistService
{
    Task<PlaylistItemDto> AddToPlaylistAsync(string roomHash, AddToPlaylistRequest request, string username);
    Task<List<PlaylistItemDto>> ReorderPlaylistAsync(string roomHash, ReorderPlaylistRequest request);
    Task<AddPlaylistByUrlResponse> AddPlaylistByUrlAsync(string roomHash, AddPlaylistByUrlRequest request, string username);
    Task<List<PlaylistItemDto>> ShufflePlaylistAsync(string roomHash);
    Task RemoveFromPlaylistAsync(string roomHash, Guid itemId);
    Task ClearPlaylistAsync(string roomHash);
    Task<List<PlaylistItemDto>> GetPlaylistAsync(string roomHash);
}
