using AssistaJunto.Domain.Entities;

namespace AssistaJunto.Tests;

public class RoomDomainTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void RoomRequiresAName(string? name) =>
        Assert.Throws<ArgumentException>(() => new Room(name!, "Dono"));

    [Fact]
    public void PrivateRoomStoresAHashAndChecksThePassword()
    {
        var room = new Room("Cinema", "Dono", "segredo");
        Assert.NotEqual("segredo", room.PasswordHash);
        Assert.True(room.ValidatePassword("segredo"));
        Assert.False(room.ValidatePassword("incorreta"));
        Assert.False(room.ValidatePassword(null));
    }

    [Fact]
    public void InsertionBeforeCurrentVideoPreservesItsPlayback()
    {
        var room = WithVideos();
        room.UpdatePlayerState(1, 42, false);
        var playing = room.GetCurrentVideo();
        room.AddToPlaylistAt("new-video", "Novo", "", "Dono", 0);
        Assert.Same(playing, room.GetCurrentVideo());
        Assert.Equal(2, room.CurrentVideoIndex);
        Assert.Equal(42, room.CurrentTime);
        Assert.False(room.IsPlaying);
        Assert.Equal(Enumerable.Range(0, 4), room.Playlist.Select(item => item.Order));
    }

    [Fact]
    public void DuplicateVideoIsRejectedIgnoringCase()
    {
        var room = WithVideos();
        Assert.Throws<InvalidOperationException>(() => room.AddToPlaylist("VIDEO-0", "Duplicado", "", "Dono"));
        Assert.Equal(3, room.Playlist.Count);
    }

    [Fact]
    public void NavigationResetsPositionAndHonorsPlaylistBoundaries()
    {
        var room = WithVideos();
        Assert.False(room.MoveToPrevious());
        room.UpdatePlayerState(0, 90, false);
        Assert.True(room.MoveToNext());
        Assert.Equal("video-1", room.GetCurrentVideo()!.VideoId);
        Assert.Equal(0, room.CurrentTime);
        Assert.True(room.IsPlaying);
        Assert.True(room.JumpToIndex(2));
        Assert.False(room.MoveToNext());
        Assert.True(room.MoveToPrevious());
        Assert.Equal("video-1", room.GetCurrentVideo()!.VideoId);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(3)]
    public void InvalidJumpDoesNotResetTheCurrentVideo(int index)
    {
        var room = WithVideos();
        room.UpdatePlayerState(1, 23, false);
        Assert.False(room.JumpToIndex(index));
        Assert.Equal(1, room.CurrentVideoIndex);
        Assert.Equal(23, room.CurrentTime);
    }

    [Fact]
    public void ShufflePreservesTheCurrentAndPreviousVideos()
    {
        var room = WithVideos(6);
        room.UpdatePlayerState(1, 42, false);
        var before = room.Playlist.ToArray();
        Assert.True(room.ShuffleUpcomingPlaylist());
        Assert.Equal(before.Take(2), room.Playlist.Take(2));
        Assert.Equal(before.Skip(2).Select(item => item.VideoId).Order(), room.Playlist.Skip(2).Select(item => item.VideoId).Order());
        Assert.Equal(1, room.CurrentVideoIndex);
        Assert.Equal(42, room.CurrentTime);
    }

    [Fact]
    public void ClearingPlaylistStopsPlaybackAndResetsPosition()
    {
        var room = WithVideos();
        room.UpdatePlayerState(2, 80, true);
        room.ClearPlaylist();
        Assert.Empty(room.Playlist);
        Assert.Null(room.GetCurrentVideo());
        Assert.Equal(0, room.CurrentVideoIndex);
        Assert.Equal(0, room.CurrentTime);
        Assert.False(room.IsPlaying);
    }

    [Fact]
    public void ConnectedUsersPreventCleanupAndCountCannotBecomeNegative()
    {
        var room = new Room("Cinema", "Dono");
        room.DecrementUsersCount();
        Assert.Equal(0, room.UsersCount);
        room.IncrementUsersCount();
        Assert.False(room.IsInactiveFor(0));
        room.DecrementUsersCount();
        Assert.True(room.IsInactiveFor(0));
        Assert.Equal(0, room.UsersCount);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void EmptyChatMessageIsRejected(string? content) =>
        Assert.Throws<ArgumentException>(() => new ChatMessage(Guid.NewGuid(), "Pessoa", content!));

    private static Room WithVideos(int count = 3)
    {
        var room = new Room("Cinema", "Dono");
        for (var i = 0; i < count; i++) room.AddToPlaylist($"video-{i}", $"Vídeo {i}", "", "Dono");
        return room;
    }
}
