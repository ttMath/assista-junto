using AssistaJunto.Application.DTOs;
using AssistaJunto.Application.Interfaces;
using AssistaJunto.Domain.Interfaces;

namespace AssistaJunto.Application.Services;

public class PlaylistService : IPlaylistService
{
    private readonly IRoomRepository _roomRepository;
    private readonly IUserRepository _userRepository;

    public PlaylistService(IRoomRepository roomRepository, IUserRepository userRepository)
    {
        _roomRepository = roomRepository;
        _userRepository = userRepository;
    }

    public async Task<PlaylistItemDto> AddToPlaylistAsync(string roomHash, AddToPlaylistRequest request, Guid userId)
    {
        var room = await _roomRepository.GetByHashAsync(roomHash)
            ?? throw new InvalidOperationException("Sala não encontrada.");

        var user = await _userRepository.GetByIdAsync(userId)
            ?? throw new InvalidOperationException("Usuário não encontrado.");

        var item = room.AddToPlaylist(request.VideoId, request.Title, request.ThumbnailUrl, userId);
        await _roomRepository.UpdateAsync(room);

        return new PlaylistItemDto(
            item.Id, item.VideoId, item.Title, item.ThumbnailUrl,
            item.Order, user.DisplayName, item.AddedAt
        );
    }

    public async Task RemoveFromPlaylistAsync(string roomHash, Guid itemId)
    {
        var room = await _roomRepository.GetByHashAsync(roomHash)
            ?? throw new InvalidOperationException("Sala não encontrada.");

        room.RemoveFromPlaylist(itemId);
        await _roomRepository.UpdateAsync(room);
    }

    public async Task<List<PlaylistItemDto>> GetPlaylistAsync(string roomHash)
    {
        var room = await _roomRepository.GetByHashAsync(roomHash)
            ?? throw new InvalidOperationException("Sala não encontrada.");

        return room.Playlist.OrderBy(p => p.Order).Select(p => new PlaylistItemDto(
            p.Id, p.VideoId, p.Title, p.ThumbnailUrl, p.Order,
            p.AddedBy?.DisplayName ?? "Desconhecido", p.AddedAt
        )).ToList();
    }
}
