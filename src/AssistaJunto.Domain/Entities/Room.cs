using System.Security.Cryptography;

namespace AssistaJunto.Domain.Entities;

public class Room
{
    public Guid Id { get; private set; }
    public string Hash { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string? PasswordHash { get; private set; }
    public Guid OwnerId { get; private set; }
    public User Owner { get; private set; } = null!;
    public bool IsActive { get; private set; }
    public int CurrentVideoIndex { get; private set; }
    public double CurrentTime { get; private set; }
    public bool IsPlaying { get; private set; }
    public int UsersCount {  get; private set; }
    public DateTime CreatedAt { get; private set; }

    private List<PlaylistItem> _playlist = [];
    public IReadOnlyCollection<PlaylistItem> Playlist => _playlist.AsReadOnly();

    private List<ChatMessage> _chatMessages = [];
    public IReadOnlyCollection<ChatMessage> ChatMessages => _chatMessages.AsReadOnly();

    private Room() { }

    public Room(string name, Guid ownerId, string? password = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Nome da sala é obrigatório.", nameof(name));

        Id = Guid.NewGuid();
        Hash = GenerateHash();
        Name = name.Trim();
        OwnerId = ownerId;
        IsActive = true;
        CurrentVideoIndex = 0;
        CurrentTime = 0;
        IsPlaying = false;
        CreatedAt = DateTime.UtcNow;
        UsersCount = 0;

        if (!string.IsNullOrWhiteSpace(password))
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
    }

    public bool ValidatePassword(string? password)
    {
        if (PasswordHash is null) return true;
        if (string.IsNullOrWhiteSpace(password)) return false;
        return BCrypt.Net.BCrypt.Verify(password, PasswordHash);
    }

    public void UpdatePlayerState(int videoIndex, double currentTime, bool isPlaying)
    {
        CurrentVideoIndex = videoIndex;
        CurrentTime = currentTime;
        IsPlaying = isPlaying;
    }

    public PlaylistItem AddToPlaylist(string videoId, string title, string thumbnailUrl, Guid addedByUserId)
    {
        if (_playlist.Any(p => p.VideoId == videoId))
            throw new InvalidOperationException("Este vídeo já está na playlist.");

        var order = _playlist.Count;
        var item = new PlaylistItem(Id, videoId, title, thumbnailUrl, order, addedByUserId);
        _playlist.Add(item);
        return item;
    }

    public bool HasVideo(string videoId)
    {
        return _playlist.Any(p => p.VideoId == videoId);
    }

    public void RemoveFromPlaylist(Guid itemId)
    {
        var item = _playlist.FirstOrDefault(x => x.Id == itemId)
            ?? throw new InvalidOperationException("Item não encontrado na playlist.");

        _playlist.Remove(item);

        for (int i = 0; i < _playlist.Count; i++)
            _playlist[i].UpdateOrder(i);
    }

    public bool MoveToNext()
    {
        if (CurrentVideoIndex < _playlist.Count - 1)
        {
            CurrentVideoIndex++;
            CurrentTime = 0;
            IsPlaying = true;
            return true;
        }
        return false;
    }

    public bool MoveToPrevious()
    {
        if (CurrentVideoIndex > 0)
        {
            CurrentVideoIndex--;
            CurrentTime = 0;
            IsPlaying = true;
            return true;
        }
        return false;
    }

    public bool JumpToIndex(int index)
    {
        if (index >= 0 && index < _playlist.Count)
        {
            CurrentVideoIndex = index;
            CurrentTime = 0;
            IsPlaying = true;
            return true;
        }
        return false;
    }

    public PlaylistItem? GetCurrentVideo()
    {
        return _playlist.OrderBy(p => p.Order).ElementAtOrDefault(CurrentVideoIndex);
    }

    public void Close()
    {
        IsActive = false;
        IsPlaying = false;
    }

    public void ClearPlaylist()
    {
        _playlist.Clear();
        CurrentVideoIndex = 0;
        CurrentTime = 0;
        IsPlaying = false;
    }

    public void IncrementUsersCount()
    {
        UsersCount++;
    }

    public void DecrementUsersCount()
    {
        if (UsersCount > 0)
            UsersCount--;
    }

    private static string GenerateHash()
    {
        var bytes = RandomNumberGenerator.GetBytes(8);
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
