using AssistaJunto.Application.DTOs;
using AssistaJunto.Application.Interfaces;
using AssistaJunto.Domain.Interfaces;
using YoutubeExplode;
using YoutubeExplode.Common;
using YoutubeExplode.Playlists;
using YoutubeExplode.Videos;

namespace AssistaJunto.Application.Services;

public class PlaylistService : IPlaylistService
{
    private readonly IRoomRepository _roomRepository;
    private readonly IUserRepository _userRepository;
    private readonly YoutubeClient _youtubeClient;

    public PlaylistService(IRoomRepository roomRepository, IUserRepository userRepository)
    {
        _roomRepository = roomRepository;
        _userRepository = userRepository;
        _youtubeClient = new YoutubeClient();
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

    public async Task<AddPlaylistByUrlResponse> AddPlaylistByUrlAsync(string roomHash, string url, Guid userId)
    {
        var room = await _roomRepository.GetByHashAsync(roomHash)
            ?? throw new InvalidOperationException("Sala não encontrada.");

        var user = await _userRepository.GetByIdAsync(userId)
            ?? throw new InvalidOperationException("Usuário não encontrado.");

        var parsedPlaylistId = PlaylistId.TryParse(url);
        var addedItems = new List<PlaylistItemDto>();

        if (parsedPlaylistId is not null)
        {
            var videos = await _youtubeClient.Playlists.GetVideosAsync(parsedPlaylistId.Value);

            foreach (var video in videos)
            {
                if (room.HasVideo(video.Id))
                    continue;

                var thumbnailUrl = video.Thumbnails.GetWithHighestResolution()?.Url
                    ?? $"https://img.youtube.com/vi/{video.Id}/mqdefault.jpg";

                var item = room.AddToPlaylist(video.Id, video.Title, thumbnailUrl, userId);

                addedItems.Add(new PlaylistItemDto(
                    item.Id, item.VideoId, item.Title, item.ThumbnailUrl,
                    item.Order, user.DisplayName, item.AddedAt
                ));
            }
        }
        else
        {
            var parsedVideoId = VideoId.TryParse(url);
            if (parsedVideoId is null)
                throw new InvalidOperationException("URL do YouTube inválida.");

            var videoIdStr = parsedVideoId.Value.Value;

            if (room.HasVideo(videoIdStr))
                throw new InvalidOperationException("Este vídeo já está na playlist.");

            var video = await _youtubeClient.Videos.GetAsync(parsedVideoId.Value);
            var thumbnailUrl = video.Thumbnails.GetWithHighestResolution()?.Url
                ?? $"https://img.youtube.com/vi/{videoIdStr}/mqdefault.jpg";

            var item = room.AddToPlaylist(video.Id, video.Title, thumbnailUrl, userId);

            addedItems.Add(new PlaylistItemDto(
                item.Id, item.VideoId, item.Title, item.ThumbnailUrl,
                item.Order, user.DisplayName, item.AddedAt
            ));
        }

        await _roomRepository.UpdateAsync(room);

        return new AddPlaylistByUrlResponse(addedItems, addedItems.Count);
    }

    public async Task RemoveFromPlaylistAsync(string roomHash, Guid itemId)
    {
        var room = await _roomRepository.GetByHashAsync(roomHash)
            ?? throw new InvalidOperationException("Sala não encontrada.");

        room.RemoveFromPlaylist(itemId);
        await _roomRepository.UpdateAsync(room);
    }

    public async Task ClearPlaylistAsync(string roomHash)
    {
        var room = await _roomRepository.GetByHashAsync(roomHash)
            ?? throw new InvalidOperationException("Sala não encontrada.");

        room.ClearPlaylist();
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
