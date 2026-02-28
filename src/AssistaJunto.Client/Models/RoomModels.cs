namespace AssistaJunto.Client.Models;

public class RoomModel
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }
    public string Hash { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool HasPassword { get; set; }
    public string OwnerDisplayName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int CurrentVideoIndex { get; set; }
    public double CurrentTime { get; set; }
    public bool IsPlaying { get; set; }
    public List<PlaylistItemModel> Playlist { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public int UsersCount { get; set; }
}

public class CreateRoomModel
{
    public string Name { get; set; } = string.Empty;
    public string? Password { get; set; }
}

public class JoinRoomModel
{
    public string? Password { get; set; }
}

public class RoomStateModel
{
    public string? VideoId { get; set; }
    public int CurrentVideoIndex { get; set; }
    public double CurrentTime { get; set; }
    public bool IsPlaying { get; set; }
    public List<PlaylistItemModel> Playlist { get; set; } = [];
}

public class PlaylistItemModel
{
    public Guid Id { get; set; }
    public string VideoId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string ThumbnailUrl { get; set; } = string.Empty;
    public int Order { get; set; }
    public string AddedByDisplayName { get; set; } = string.Empty;
    public DateTime AddedAt { get; set; }
}

public class AddToPlaylistModel
{
    public string VideoId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string ThumbnailUrl { get; set; } = string.Empty;
}

public class AddPlaylistByUrlResponseModel
{
    public List<PlaylistItemModel> Items { get; set; } = [];
    public int TotalAdded { get; set; }
}

public class ChatMessageModel
{
    public Guid Id { get; set; }
    public string UserDisplayName { get; set; } = string.Empty;
    public string UserAvatarUrl { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime SentAt { get; set; }
}

public class PlayerActionModel
{
    public int Action { get; set; }
    public double? SeekTime { get; set; }
    public string? VideoId { get; set; }
    public int? ExpectedIndex { get; set; }
}

public class RoomUserModel
{
    public string DisplayName { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
}

public class ToastNotification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
