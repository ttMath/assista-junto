namespace AssistaJunto.Domain.Entities;

public class PlaylistItem
{
    public Guid Id { get; private set; }
    public Guid RoomId { get; private set; }
    public string VideoId { get; private set; } = string.Empty;
    public string Title { get; private set; } = string.Empty;
    public string ThumbnailUrl { get; private set; } = string.Empty;
    public int Order { get; private set; }
    public Guid AddedByUserId { get; private set; }
    public User AddedBy { get; private set; } = null!;
    public DateTime AddedAt { get; private set; }

    private PlaylistItem() { }

    public PlaylistItem(Guid roomId, string videoId, string title, string thumbnailUrl, int order, Guid addedByUserId)
    {
        if (string.IsNullOrWhiteSpace(videoId))
            throw new ArgumentException("Video ID é obrigatório.", nameof(videoId));

        RoomId = roomId;
        VideoId = videoId;
        Title = title;
        ThumbnailUrl = thumbnailUrl;
        Order = order;
        AddedByUserId = addedByUserId;
        AddedAt = DateTime.UtcNow;
    }

    public void UpdateOrder(int newOrder)
    {
        Order = newOrder;
    }
}
