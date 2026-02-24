namespace AssistaJunto.Application.DTOs;

public record RoomDto(
    Guid Id,
    string Hash,
    string Name,
    bool HasPassword,
    string OwnerDisplayName,
    bool IsActive,
    int CurrentVideoIndex,
    double CurrentTime,
    bool IsPlaying,
    List<PlaylistItemDto> Playlist,
    DateTime CreatedAt,
    Guid OwnerId
);

public record CreateRoomRequest(string Name, string? Password);

public record JoinRoomRequest(string? Password);

public record RoomStateDto(
    string? VideoId,
    int CurrentVideoIndex,
    double CurrentTime,
    bool IsPlaying,
    List<PlaylistItemDto> Playlist
);
