namespace AssistaJunto.Application.DTOs;

public record PlaylistItemDto(
    Guid Id,
    string VideoId,
    string Title,
    string ThumbnailUrl,
    int Order,
    string AddedByDisplayName,
    DateTime AddedAt
);

public record AddToPlaylistRequest(string VideoId, string Title, string ThumbnailUrl);

public record AddPlaylistByUrlRequest(string Url);

public record AddPlaylistByUrlResponse(List<PlaylistItemDto> Items, int TotalAdded);
