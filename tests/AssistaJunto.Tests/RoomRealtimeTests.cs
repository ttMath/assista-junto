using System.Net.Http.Json;
using System.Threading.Channels;
using AssistaJunto.Application.DTOs;
using AssistaJunto.Domain.Enums;
using Microsoft.AspNetCore.SignalR.Client;

namespace AssistaJunto.Tests;

public class RoomRealtimeTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task ChatPresenceAndHistorySurviveLeavingAndReenteringTheRoom()
    {
        using var http = factory.CreateClient();
        http.DefaultRequestHeaders.Add("X-Username", "Dono");
        var room = await RoomApiTests.Create(http, $"Chat-{Guid.NewGuid():N}");
        await using var owner = factory.CreateHub("Dono");
        await using var friend = factory.CreateHub("Amigo");
        var users = Channel.CreateUnbounded<List<RoomUserInfo>>();
        var messages = Channel.CreateUnbounded<ChatMessageDto>();
        var history = Channel.CreateUnbounded<List<ChatMessageDto>>();
        owner.On<List<RoomUserInfo>>("ReceiveUserList", value => users.Writer.TryWrite(value));
        friend.On<ChatMessageDto>("ReceiveChatMessage", value => messages.Writer.TryWrite(value));
        friend.On<List<ChatMessageDto>>("ReceiveChatHistory", value => history.Writer.TryWrite(value));
        await owner.StartAsync();
        await owner.InvokeAsync("JoinRoom", room.Hash);
        await friend.StartAsync();
        await friend.InvokeAsync("JoinRoom", room.Hash);
        var connected = await ReadUntil(users.Reader, value => value.Count == 2);
        Assert.Equal(new[] { "Amigo", "Dono" }, connected.Select(user => user.DisplayName).Order());

        await owner.InvokeAsync("SendChatMessage", room.Hash, "Mensagem real em C#");
        var received = await ReadUntil(messages.Reader, value => value.Content == "Mensagem real em C#");
        Assert.Equal("Dono", received.UserDisplayName);
        Assert.NotEqual(Guid.Empty, received.Id);

        await friend.StopAsync();
        var remaining = await ReadUntil(users.Reader, value => value.Count == 1);
        Assert.Equal("Dono", remaining[0].DisplayName);
        await friend.StartAsync();
        await friend.InvokeAsync("JoinRoom", room.Hash);
        var restored = await ReadUntil(history.Reader, value => value.Any(message => message.Id == received.Id));
        Assert.Single(restored, message => message.Id == received.Id);
        connected = await ReadUntil(users.Reader, value => value.Count == 2);
        Assert.Equal(2, connected.Select(user => user.DisplayName).Distinct().Count());
    }

    [Fact]
    public async Task PlaylistAndPlaybackActionsReachOtherParticipantsAndIgnoreStaleProgress()
    {
        using var http = factory.CreateClient();
        http.DefaultRequestHeaders.Add("X-Username", "Host");
        var room = await RoomApiTests.Create(http, $"Player-{Guid.NewGuid():N}");
        await using var host = factory.CreateHub("Host");
        await using var guest = factory.CreateHub("Guest");
        var playlist = Channel.CreateUnbounded<PlaylistItemDto>();
        var actions = Channel.CreateUnbounded<PlayerActionDto>();
        guest.On<PlaylistItemDto>("PlaylistUpdated", value => playlist.Writer.TryWrite(value));
        guest.On<PlayerActionDto>("ReceivePlayerAction", value => actions.Writer.TryWrite(value));
        await host.StartAsync(); await host.InvokeAsync("JoinRoom", room.Hash);
        await guest.StartAsync(); await guest.InvokeAsync("JoinRoom", room.Hash);
        await host.InvokeAsync("AddToPlaylist", room.Hash, new AddToPlaylistRequest("first-video", "Primeiro", ""));
        var first = await ReadUntil(playlist.Reader, value => value.VideoId == "first-video");
        Assert.NotEqual(Guid.Empty, first.Id);
        await host.InvokeAsync("AddToPlaylist", room.Hash, new AddToPlaylistRequest("next-video", "Próximo", ""));
        await ReadUntil(playlist.Reader, value => value.VideoId == "next-video");

        await host.InvokeAsync("SendPlayerAction", room.Hash, new PlayerActionDto(PlayerAction.Play, 12, null, 0));
        var played = await ReadUntil(actions.Reader, value => value.Action == PlayerAction.Play);
        Assert.Equal(12, played.SeekTime);
        Assert.True((await State()).IsPlaying);
        await host.InvokeAsync("SendPlayerAction", room.Hash, new PlayerActionDto(PlayerAction.Pause, 15, null, 0));
        await ReadUntil(actions.Reader, value => value.Action == PlayerAction.Pause);
        Assert.False((await State()).IsPlaying);
        await host.InvokeAsync("SendPlayerAction", room.Hash, new PlayerActionDto(PlayerAction.SeekTo, 42, null, 0));
        await ReadUntil(actions.Reader, value => value.Action == PlayerAction.SeekTo);
        Assert.Equal(42, (await State()).CurrentTime);
        await host.InvokeAsync("ReportPlaybackProgress", room.Hash, 999d, 99);
        Assert.Equal(42, (await State()).CurrentTime);
        await host.InvokeAsync("SendPlayerAction", room.Hash, new PlayerActionDto(PlayerAction.NextVideo, null, null, 0));
        Assert.Equal(1, (await State()).CurrentVideoIndex);
        await host.InvokeAsync("SendPlayerAction", room.Hash, new PlayerActionDto(PlayerAction.PreviousVideo, null, null, 1));
        Assert.Equal(0, (await State()).CurrentVideoIndex);

        async Task<RoomDto> State() => (await http.GetFromJsonAsync<RoomDto>($"/api/rooms/{room.Hash}"))!;
    }

    [Fact]
    public async Task ChatBurstLimitBlocksTheFourthMessage()
    {
        using var http = factory.CreateClient();
        http.DefaultRequestHeaders.Add("X-Username", "Autor");
        var room = await RoomApiTests.Create(http, $"Antispam-{Guid.NewGuid():N}");
        await using var connection = factory.CreateHub("Autor");
        var blocked = new TaskCompletionSource<int>(TaskCreationOptions.RunContinuationsAsynchronously);
        connection.On<int, string>("ChatBlocked", (seconds, _) => blocked.TrySetResult(seconds));
        await connection.StartAsync(); await connection.InvokeAsync("JoinRoom", room.Hash);
        for (var i = 0; i < 4; i++) await connection.InvokeAsync("SendChatMessage", room.Hash, $"Mensagem {i}");
        Assert.InRange(await blocked.Task.WaitAsync(TimeSpan.FromSeconds(10)), 1, 60);
    }

    private static async Task<T> ReadUntil<T>(ChannelReader<T> reader, Func<T, bool> matches)
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        while (true)
        {
            var value = await reader.ReadAsync(timeout.Token);
            if (matches(value)) return value;
        }
    }
}
