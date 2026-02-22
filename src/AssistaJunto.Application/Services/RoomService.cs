using AssistaJunto.Application.DTOs;
using AssistaJunto.Application.Interfaces;
using AssistaJunto.Domain.Entities;
using AssistaJunto.Domain.Interfaces;

namespace AssistaJunto.Application.Services;

public class RoomService : IRoomService
{
    private readonly IRoomRepository _roomRepository;
    private readonly IUserRepository _userRepository;

    public RoomService(IRoomRepository roomRepository, IUserRepository userRepository)
    {
        _roomRepository = roomRepository;
        _userRepository = userRepository;
    }

    public async Task<RoomDto> CreateRoomAsync(CreateRoomRequest request, Guid userId)
    {
        var room = new Room(request.Name, userId, request.Password);
        await _roomRepository.AddAsync(room);

        var owner = await _userRepository.GetByIdAsync(userId)
            ?? throw new InvalidOperationException("Usuário não encontrado.");

        return MapToDto(room, owner.DisplayName);
    }

    public async Task<List<RoomDto>> GetActiveRoomsAsync()
    {
        var rooms = await _roomRepository.GetActiveRoomsAsync();
        var dtos = new List<RoomDto>();

        foreach (var room in rooms)
        {
            var owner = await _userRepository.GetByIdAsync(room.OwnerId);
            dtos.Add(MapToDto(room, owner?.DisplayName ?? "Desconhecido"));
        }

        return dtos;
    }

    public async Task<RoomDto?> GetRoomByHashAsync(string hash)
    {
        var room = await _roomRepository.GetByHashAsync(hash);
        if (room is null) return null;

        var owner = await _userRepository.GetByIdAsync(room.OwnerId);
        return MapToDto(room, owner?.DisplayName ?? "Desconhecido");
    }

    public async Task<RoomStateDto?> GetRoomStateAsync(string hash)
    {
        var room = await _roomRepository.GetByHashAsync(hash);
        if (room is null) return null;

        var currentVideo = room.GetCurrentVideo();
        var playlist = MapPlaylist(room);

        return new RoomStateDto(
            currentVideo?.VideoId,
            room.CurrentVideoIndex,
            room.CurrentTime,
            room.IsPlaying,
            playlist
        );
    }

    public async Task<bool> JoinRoomAsync(string hash, string? password)
    {
        var room = await _roomRepository.GetByHashAsync(hash);
        if (room is null || !room.IsActive) return false;
        return room.ValidatePassword(password);
    }

    public async Task UpdatePlayerStateAsync(string hash, double currentTime, bool isPlaying)
    {
        var room = await _roomRepository.GetByHashAsync(hash)
            ?? throw new InvalidOperationException("Sala não encontrada.");

        room.UpdatePlayerState(room.CurrentVideoIndex, currentTime, isPlaying);
        await _roomRepository.UpdateAsync(room);
    }

    public async Task<bool> NextVideoAsync(string hash)
    {
        var room = await _roomRepository.GetByHashAsync(hash)
            ?? throw new InvalidOperationException("Sala não encontrada.");

        var moved = room.MoveToNext();
        if (moved) await _roomRepository.UpdateAsync(room);
        return moved;
    }

    public async Task<bool> PreviousVideoAsync(string hash)
    {
        var room = await _roomRepository.GetByHashAsync(hash)
            ?? throw new InvalidOperationException("Sala não encontrada.");

        var moved = room.MoveToPrevious();
        if (moved) await _roomRepository.UpdateAsync(room);
        return moved;
    }

    public async Task CloseRoomAsync(string hash, Guid userId)
    {
        var room = await _roomRepository.GetByHashAsync(hash)
            ?? throw new InvalidOperationException("Sala não encontrada.");

        if (room.OwnerId != userId)
            throw new UnauthorizedAccessException("Apenas o dono da sala pode fechá-la.");

        room.Close();
        await _roomRepository.UpdateAsync(room);
    }

    private static RoomDto MapToDto(Room room, string ownerDisplayName)
    {
        return new RoomDto(
            room.Id, room.Hash, room.Name,
            room.PasswordHash is not null,
            ownerDisplayName, room.IsActive,
            room.CurrentVideoIndex, room.CurrentTime, room.IsPlaying,
            MapPlaylist(room), room.CreatedAt
        );
    }

    private static List<PlaylistItemDto> MapPlaylist(Room room)
    {
        return room.Playlist.OrderBy(p => p.Order).Select(p => new PlaylistItemDto(
            p.Id, p.VideoId, p.Title, p.ThumbnailUrl, p.Order,
            p.AddedBy?.DisplayName ?? "Desconhecido", p.AddedAt
        )).ToList();
    }
}
