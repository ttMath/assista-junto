using System.Text.RegularExpressions;
using System.Net.Http.Json;
using AssistaJunto.Application.DTOs;
using AssistaJunto.Application.Interfaces;
using AssistaJunto.Domain.Interfaces;
using YoutubeExplode;
using YoutubeExplode.Common;
using YoutubeExplode.Exceptions;
using YoutubeExplode.Playlists;
using YoutubeExplode.Videos;

namespace AssistaJunto.Application.Services;

public class PlaylistService : IPlaylistService
{
    private readonly IRoomRepository _roomRepository;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly YoutubeClient _youtubeClient;

    public PlaylistService(IRoomRepository roomRepository, IHttpClientFactory httpClientFactory)
    {
        _roomRepository = roomRepository;
        _httpClientFactory = httpClientFactory;
        _youtubeClient = new YoutubeClient();
    }

    private static VideoId? TryParseVideoId(string url)
    {
        var parsedVideoId = VideoId.TryParse(url);
        if (parsedVideoId is not null)
            return parsedVideoId;

        var patterns = new[]
        {
            @"(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})",
            @"youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})"
        };

        foreach (var pattern in patterns)
        {
            var match = Regex.Match(url, pattern);
            if (match.Success && match.Groups.Count > 1)
            {
                var videoIdStr = match.Groups[1].Value;
                if (VideoId.TryParse(videoIdStr) is { } videoId)
                    return videoId;
            }
        }

        return null;
    }

    private async Task<YoutubeOEmbedResponse?> TryGetYoutubeOEmbedAsync(string videoId)
    {
        var client = _httpClientFactory.CreateClient();
        var watchUrl = $"https://www.youtube.com/watch?v={videoId}";
        var oEmbedUrl = $"https://www.youtube.com/oembed?url={Uri.EscapeDataString(watchUrl)}&format=json";

        try
        {
            var response = await client.GetAsync(oEmbedUrl);
            if (!response.IsSuccessStatusCode)
                return null;

            var oEmbed = await response.Content.ReadFromJsonAsync<YoutubeOEmbedResponse>();
            if (string.IsNullOrWhiteSpace(oEmbed?.Title))
                return null;

            return oEmbed;
        }
        catch
        {
            return null;
        }
    }

    private async Task<(string Title, string ThumbnailUrl)> GetValidatedVideoMetadataAsync(string videoId)
    {
        var oEmbed = await TryGetYoutubeOEmbedAsync(videoId);
        if (oEmbed is null)
            throw new InvalidOperationException("Não foi possível validar este vídeo no YouTube. Verifique se a URL está correta e se o vídeo é público.");

        var thumbnailUrl = $"https://i.ytimg.com/vi/{videoId}/maxresdefault.jpg";
        return (oEmbed.Title!, thumbnailUrl);
    }

    private static PlaylistItemDto MapItemToDto(AssistaJunto.Domain.Entities.PlaylistItem item)
    {
        return new PlaylistItemDto(
            item.Id,
            item.VideoId,
            item.Title,
            item.ThumbnailUrl,
            item.Order,
            item.AddedByDisplayName,
            item.AddedAt
        );
    }

    private static int ResolveInsertIndex(AssistaJunto.Domain.Entities.Room room, PlaylistInsertMode insertMode)
    {
        if (room.Playlist.Count == 0)
            return 0;

        return insertMode switch
        {
            PlaylistInsertMode.AfterCurrent or PlaylistInsertMode.PlayNow
                => Math.Min(room.CurrentVideoIndex + 1, room.Playlist.Count),
            _ => room.Playlist.Count
        };
    }

    private static void ShuffleInPlace<T>(IList<T> items)
    {
        for (var i = items.Count - 1; i > 0; i--)
        {
            var j = Random.Shared.Next(i + 1);
            (items[i], items[j]) = (items[j], items[i]);
        }
    }

    public async Task<PlaylistItemDto> AddToPlaylistAsync(string roomHash, AddToPlaylistRequest request, string username)
    {
        var room = await _roomRepository.GetByHashAsync(roomHash)
            ?? throw new InvalidOperationException("Sala não encontrada.");

        var item = room.AddToPlaylist(request.VideoId, request.Title, request.ThumbnailUrl, username);
        await _roomRepository.UpdateAsync(room);

        return MapItemToDto(item);
    }

    public async Task<List<PlaylistItemDto>> ReorderPlaylistAsync(string roomHash, ReorderPlaylistRequest request)
    {
        var room = await _roomRepository.GetByHashAsync(roomHash)
            ?? throw new InvalidOperationException("Sala não encontrada.");

        var changed = room.ReorderPlaylistItem(request.ItemId, request.TargetIndex);
        if (changed)
            await _roomRepository.UpdateAsync(room);

        return room.Playlist.OrderBy(p => p.Order).Select(MapItemToDto).ToList();
    }

    public async Task<AddPlaylistByUrlResponse> AddPlaylistByUrlAsync(string roomHash, AddPlaylistByUrlRequest request, string username)
    {
        var room = await _roomRepository.GetByHashAsync(roomHash)
            ?? throw new InvalidOperationException("Sala não encontrada.");

        if (string.IsNullOrWhiteSpace(request.Url))
            throw new InvalidOperationException("URL do YouTube inválida.");

        var parsedPlaylistId = PlaylistId.TryParse(request.Url);
        var addedItems = new List<PlaylistItemDto>();
        var candidates = new List<(string VideoId, string Title, string ThumbnailUrl)>();
        var knownVideoIds = new HashSet<string>(
            room.Playlist.Select(p => p.VideoId),
            StringComparer.OrdinalIgnoreCase
        );

        if (parsedPlaylistId is not null)
        {
            IReadOnlyList<PlaylistVideo> videos;
            try
            {
                videos = await _youtubeClient.Playlists.GetVideosAsync(parsedPlaylistId.Value);
            }
            catch (YoutubeExplodeException ex)
            {
                throw new InvalidOperationException($"Não foi possível ler a playlist informada. Verifique se ela é pública e tente novamente. Detalhes técnicos: {ex.GetType().Name}: {ex.Message}", ex);
            }

            foreach (var video in videos)
            {
                var videoId = video.Id.Value;
                if (!knownVideoIds.Add(videoId))
                    continue;

                var thumbnailUrl = video.Thumbnails.GetWithHighestResolution()?.Url
                    ?? $"https://img.youtube.com/vi/{videoId}/mqdefault.jpg";

                candidates.Add((videoId, video.Title, thumbnailUrl));
            }
        }
        else
        {
            var parsedVideoId = TryParseVideoId(request.Url);
            if (parsedVideoId is null)
                throw new InvalidOperationException("URL do YouTube inválida.");

            var videoIdStr = parsedVideoId.Value.Value;

            if (!knownVideoIds.Add(videoIdStr))
                throw new InvalidOperationException("Este vídeo já está na playlist.");

            var validatedMetadata = await GetValidatedVideoMetadataAsync(videoIdStr);

            var title = validatedMetadata.Title;
            var thumbnailUrl = validatedMetadata.ThumbnailUrl;
            string finalVideoId = videoIdStr;

            try
            {
                var video = await _youtubeClient.Videos.GetAsync(parsedVideoId.Value);
                finalVideoId = video.Id;
                title = string.IsNullOrWhiteSpace(video.Title) ? title : video.Title;
                thumbnailUrl = video.Thumbnails.GetWithHighestResolution()?.Url
                    ?? thumbnailUrl;
            }
            catch (VideoUnavailableException)
            {
            }
            catch (YoutubeExplodeException)
            {
            }

            if (!string.Equals(finalVideoId, videoIdStr, StringComparison.OrdinalIgnoreCase) && !knownVideoIds.Add(finalVideoId))
                throw new InvalidOperationException("Este vídeo já está na playlist.");

            candidates.Add((finalVideoId, title, thumbnailUrl));
        }

        if (request.Shuffle && candidates.Count > 1)
            ShuffleInPlace(candidates);

        var insertIndex = ResolveInsertIndex(room, request.InsertMode);

        for (var i = 0; i < candidates.Count; i++)
        {
            var candidate = candidates[i];
            var targetIndex = request.InsertMode == PlaylistInsertMode.End
                ? room.Playlist.Count
                : Math.Min(insertIndex + i, room.Playlist.Count);

            var item = room.AddToPlaylistAt(
                candidate.VideoId,
                candidate.Title,
                candidate.ThumbnailUrl,
                username,
                targetIndex
            );

            addedItems.Add(MapItemToDto(item));
        }

        if (request.InsertMode == PlaylistInsertMode.PlayNow && addedItems.Count > 0)
            room.JumpToIndex(insertIndex);

        await _roomRepository.UpdateAsync(room);

        return new AddPlaylistByUrlResponse(addedItems, addedItems.Count);
    }

    public async Task<List<PlaylistItemDto>> ShufflePlaylistAsync(string roomHash)
    {
        var room = await _roomRepository.GetByHashAsync(roomHash)
            ?? throw new InvalidOperationException("Sala não encontrada.");

        var changed = room.ShuffleUpcomingPlaylist();
        if (changed)
            await _roomRepository.UpdateAsync(room);

        return room.Playlist.OrderBy(p => p.Order).Select(MapItemToDto).ToList();
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
            p.AddedByDisplayName, p.AddedAt
        )).ToList();
    }
}
