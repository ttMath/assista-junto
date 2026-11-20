using System.Net;
using System.Net.Http.Json;
using AssistaJunto.Application.DTOs;

namespace AssistaJunto.Tests;

public class RoomApiTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task CreationRequiresAValidUsernameAndPreservesUnicodeIdentity()
    {
        using var client = factory.CreateClient();
        var request = new CreateRoomRequest("Cinema", null);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/rooms", request)).StatusCode);
        client.DefaultRequestHeaders.Add("X-Username", Uri.EscapeDataString(new string('a', 51)));
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/rooms", request)).StatusCode);
        client.DefaultRequestHeaders.Remove("X-Username");
        var name = $"João 🚀 {Guid.NewGuid():N}";
        client.DefaultRequestHeaders.Add("X-Username", Uri.EscapeDataString(name));
        var response = await client.PostAsJsonAsync("/api/rooms", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var room = (await response.Content.ReadFromJsonAsync<RoomDto>())!;
        Assert.Equal(name, room.OwnerDisplayName);
        Assert.Equal(16, room.Hash.Length);
        Assert.NotNull(await client.GetFromJsonAsync<RoomDto>(response.Headers.Location));
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/rooms/missing")).StatusCode);
    }

    [Fact]
    public async Task PrivateRoomRejectsWrongPasswordAndReturnsStateAfterValidEntry()
    {
        using var client = Client();
        var room = await Create(client, "Privada", "segredo");
        Assert.True(room.HasPassword);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync($"/api/rooms/{room.Hash}/join", new JoinRoomRequest("errada"))).StatusCode);
        var response = await client.PostAsJsonAsync($"/api/rooms/{room.Hash}/join", new JoinRoomRequest("segredo"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var state = await response.Content.ReadFromJsonAsync<RoomStateDto>();
        Assert.NotNull(state);
        Assert.Empty(state.Playlist);
    }

    [Fact]
    public async Task OwnerCannotCreateDuplicateNamesOrMoreThanThreeActiveRooms()
    {
        using var client = Client();
        await Create(client, "Cinema");
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync("/api/rooms", new CreateRoomRequest(" cinema ", null))).StatusCode);
        await Create(client, "Segunda");
        await Create(client, "Terceira");
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync("/api/rooms", new CreateRoomRequest("Quarta", null))).StatusCode);
    }

    [Fact]
    public async Task ReorderAndRemovalPreserveTheCurrentlyPlayingVideo()
    {
        using var client = Client();
        var room = await Create(client, "Playlist");
        var path = $"/api/rooms/{room.Hash}/playlist";
        var first = await Add(client, path, "first");
        var second = await Add(client, path, "second");
        var third = await Add(client, path, "third");
        Assert.NotEqual(Guid.Empty, first.Id);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsJsonAsync(path + "/reorder", new ReorderPlaylistRequest(third.Id, 0))).StatusCode);
        var updated = (await client.GetFromJsonAsync<RoomDto>($"/api/rooms/{room.Hash}"))!;
        Assert.Equal(new[] { third.Id, first.Id, second.Id }, updated.Playlist.Select(item => item.Id));
        Assert.Equal(first.Id, updated.Playlist[updated.CurrentVideoIndex].Id);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"{path}/{third.Id}")).StatusCode);
        updated = (await client.GetFromJsonAsync<RoomDto>($"/api/rooms/{room.Hash}"))!;
        Assert.Equal(0, updated.CurrentVideoIndex);
        Assert.Equal(first.Id, updated.Playlist[0].Id);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync(path)).StatusCode);
        updated = (await client.GetFromJsonAsync<RoomDto>($"/api/rooms/{room.Hash}"))!;
        Assert.Empty(updated.Playlist);
        Assert.False(updated.IsPlaying);
    }

    [Fact]
    public async Task OnlyOwnerCanDeleteTheRoom()
    {
        using var owner = Client();
        using var guest = Client();
        var room = await Create(owner, "Permissões");
        Assert.Equal(HttpStatusCode.Forbidden, (await guest.DeleteAsync($"/api/rooms/{room.Hash}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await owner.DeleteAsync($"/api/rooms/{room.Hash}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await owner.GetAsync($"/api/rooms/{room.Hash}")).StatusCode);
    }

    private HttpClient Client()
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Username", $"Teste-{Guid.NewGuid():N}");
        return client;
    }

    internal static async Task<RoomDto> Create(HttpClient client, string name, string? password = null)
    {
        using var response = await client.PostAsJsonAsync("/api/rooms", new CreateRoomRequest(name, password));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<RoomDto>())!;
    }

    private static async Task<PlaylistItemDto> Add(HttpClient client, string path, string videoId)
    {
        using var response = await client.PostAsJsonAsync(path, new AddToPlaylistRequest(videoId, videoId, ""));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<PlaylistItemDto>())!;
    }
}
