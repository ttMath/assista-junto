using AssistaJunto.Domain.Entities;

namespace AssistaJunto.Domain.Interfaces;

public interface IRoomRepository
{
    Task<Room?> GetByIdAsync(Guid id);
    Task<Room?> GetByHashAsync(string hash);
    Task<List<Room>> GetActiveRoomsAsync();
    Task AddAsync(Room room);
    Task UpdateAsync(Room room);
    Task DeleteAsync(Room room);
}
