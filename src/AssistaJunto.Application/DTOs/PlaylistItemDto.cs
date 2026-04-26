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

public record ReorderPlaylistRequest(Guid ItemId, int TargetIndex);

public enum PlaylistInsertMode
{
    End,
    AfterCurrent,
    PlayNow
}

public record AddPlaylistByUrlRequest(
    string Url,
    bool Shuffle = false,
    PlaylistInsertMode InsertMode = PlaylistInsertMode.End
);

public record AddPlaylistByUrlResponse(List<PlaylistItemDto> Items, int TotalAdded);
