using System.Security.Cryptography;

namespace AssistaJunto.Domain.Entities;

public class Room
{
    public Guid Id { get; private set; }
    public string Hash { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string? PasswordHash { get; private set; }
    public string OwnerName { get; private set; } = string.Empty;
    public bool IsActive { get; private set; }
    public int CurrentVideoIndex { get; private set; }
    public double CurrentTime { get; private set; }
    public bool IsPlaying { get; private set; }
    public int UsersCount {  get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime LastActivityAt { get; private set; }

    private List<PlaylistItem> _playlist = [];
    public IReadOnlyCollection<PlaylistItem> Playlist => _playlist.AsReadOnly();

    private List<ChatMessage> _chatMessages = [];
    public IReadOnlyCollection<ChatMessage> ChatMessages => _chatMessages.AsReadOnly();

    private Room() { }

    public Room(string name, string ownerName, string? password = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Nome da sala é obrigatório.", nameof(name));

        Id = Guid.NewGuid();
        Hash = GenerateHash();
        Name = name.Trim();
        OwnerName = ownerName;
        IsActive = true;
        CurrentVideoIndex = 0;
        CurrentTime = 0;
        IsPlaying = false;
        CreatedAt = DateTime.UtcNow;
        LastActivityAt = DateTime.UtcNow;
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

    public PlaylistItem AddToPlaylist(string videoId, string title, string thumbnailUrl, string addedByName)
    {
        return AddToPlaylistAt(videoId, title, thumbnailUrl, addedByName, null);
    }

    public PlaylistItem AddToPlaylistAt(string videoId, string title, string thumbnailUrl, string addedByName, int? order)
    {
        if (_playlist.Any(p => string.Equals(p.VideoId, videoId, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException("Este vídeo já está na playlist.");

        _playlist.Sort((a, b) => a.Order.CompareTo(b.Order));

        var wasEmpty = _playlist.Count == 0;
        var insertIndex = order.HasValue
            ? Math.Clamp(order.Value, 0, _playlist.Count)
            : _playlist.Count;

        if (!wasEmpty && insertIndex <= CurrentVideoIndex)
            CurrentVideoIndex++;

        var item = new PlaylistItem(Id, videoId, title, thumbnailUrl, insertIndex, addedByName);
        _playlist.Insert(insertIndex, item);

        for (int i = insertIndex + 1; i < _playlist.Count; i++)
            _playlist[i].UpdateOrder(i);

        if (wasEmpty)
        {
            CurrentVideoIndex = 0;
            CurrentTime = 0;
            IsPlaying = true;
        }

        return item;
    }

    public bool HasVideo(string videoId)
    {
        return _playlist.Any(p => string.Equals(p.VideoId, videoId, StringComparison.OrdinalIgnoreCase));
    }

    public void RemoveFromPlaylist(Guid itemId)
    {
        _playlist.Sort((a, b) => a.Order.CompareTo(b.Order));

        var item = _playlist.FirstOrDefault(x => x.Id == itemId)
            ?? throw new InvalidOperationException("Item não encontrado na playlist.");

        var removedOrder = item.Order;
        var removedCurrent = removedOrder == CurrentVideoIndex;

        _playlist.Remove(item);

        if (_playlist.Count == 0)
        {
            CurrentVideoIndex = 0;
            CurrentTime = 0;
            IsPlaying = false;
            return;
        }

        if (removedOrder < CurrentVideoIndex)
            CurrentVideoIndex--;

        if (CurrentVideoIndex >= _playlist.Count)
            CurrentVideoIndex = _playlist.Count - 1;

        if (removedCurrent)
            CurrentTime = 0;

        for (int i = 0; i < _playlist.Count; i++)
            _playlist[i].UpdateOrder(i);
    }

    public bool ReorderPlaylistItem(Guid itemId, int targetIndex)
    {
        if (_playlist.Count <= 1)
            return false;

        _playlist.Sort((a, b) => a.Order.CompareTo(b.Order));

        var sourceIndex = _playlist.FindIndex(x => x.Id == itemId);
        if (sourceIndex < 0)
            throw new InvalidOperationException("Item não encontrado na playlist.");

        var clampedTargetIndex = Math.Clamp(targetIndex, 0, _playlist.Count - 1);
        if (sourceIndex == clampedTargetIndex)
            return false;

        PlaylistItem? currentItem = null;
        if (CurrentVideoIndex >= 0 && CurrentVideoIndex < _playlist.Count)
            currentItem = _playlist[CurrentVideoIndex];

        var movedItem = _playlist[sourceIndex];
        _playlist.RemoveAt(sourceIndex);
        _playlist.Insert(clampedTargetIndex, movedItem);

        for (int i = 0; i < _playlist.Count; i++)
            _playlist[i].UpdateOrder(i);

        if (currentItem is not null)
        {
            var currentIndex = _playlist.FindIndex(x => x.Id == currentItem.Id);
            CurrentVideoIndex = currentIndex >= 0
                ? currentIndex
                : Math.Clamp(CurrentVideoIndex, 0, _playlist.Count - 1);
        }
        else
        {
            CurrentVideoIndex = Math.Clamp(CurrentVideoIndex, 0, _playlist.Count - 1);
        }

        return true;
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

    public bool ShuffleUpcomingPlaylist()
    {
        if (_playlist.Count <= 1)
            return false;

        _playlist.Sort((a, b) => a.Order.CompareTo(b.Order));

        var hasCurrentVideo = CurrentVideoIndex >= 0
            && CurrentVideoIndex < _playlist.Count
            && (IsPlaying || CurrentTime > 0);

        var shuffleStartIndex = hasCurrentVideo
            ? Math.Min(CurrentVideoIndex + 1, _playlist.Count)
            : 0;

        if (_playlist.Count - shuffleStartIndex <= 1)
            return false;

        for (int i = _playlist.Count - 1; i > shuffleStartIndex; i--)
        {
            var j = RandomNumberGenerator.GetInt32(shuffleStartIndex, i + 1);
            (_playlist[i], _playlist[j]) = (_playlist[j], _playlist[i]);
        }

        for (int i = 0; i < _playlist.Count; i++)
            _playlist[i].UpdateOrder(i);

        return true;
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
        LastActivityAt = DateTime.UtcNow;
    }

    public void DecrementUsersCount()
    {
        if (UsersCount > 0)
            UsersCount--;
        LastActivityAt = DateTime.UtcNow;
    }

    public bool IsInactiveFor(int minutes)
    {
        lock (this) 
        {
            var inactiveDuration = DateTime.UtcNow - LastActivityAt;
            return inactiveDuration.TotalMinutes >= minutes && UsersCount == 0;
        }
    }

    private static string GenerateHash()
    {
        var bytes = RandomNumberGenerator.GetBytes(8);
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
