using AssistaJunto.Application.DTOs;

namespace AssistaJunto.Application.Interfaces;

public interface IRoomService
{
    Task<RoomDto> CreateRoomAsync(CreateRoomRequest request, Guid userId);
    Task<List<RoomDto>> GetActiveRoomsAsync();
    Task<RoomDto?> GetRoomByHashAsync(string hash);
    Task<RoomStateDto?> GetRoomStateAsync(string hash);
    Task<bool> JoinRoomAsync(string hash, string? password);
    Task UpdatePlayerStateAsync(string hash, double currentTime, bool isPlaying);
    Task<bool> NextVideoAsync(string hash, int? expectedIndex = null);
    Task<bool> PreviousVideoAsync(string hash, int? expectedIndex = null);
    Task<bool> JumpToVideoAsync(string hash, int videoIndex);
    Task CloseRoomAsync(string hash, Guid userId);
    Task DeleteRoomAsync(string hash, Guid userId);
    Task IncrementUserCountAsync(string hash);
    Task DecrementUserCountAsync(string hash);
}
