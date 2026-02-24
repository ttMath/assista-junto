using AssistaJunto.Domain.Entities;
using AssistaJunto.Domain.Interfaces;
using AssistaJunto.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AssistaJunto.Infrastructure.Repositories;

public class RoomRepository : IRoomRepository
{
    private readonly AppDbContext _context;

    public RoomRepository(AppDbContext context) => _context = context;

    public async Task<Room?> GetByIdAsync(Guid id) =>
        await _context.Rooms
            .Include(r => r.Owner)
            .Include(r => r.Playlist.OrderBy(p => p.Order)).ThenInclude(p => p.AddedBy)
            .FirstOrDefaultAsync(r => r.Id == id);

    public async Task<Room?> GetByHashAsync(string hash) =>
        await _context.Rooms
            .Include(r => r.Owner)
            .Include(r => r.Playlist.OrderBy(p => p.Order)).ThenInclude(p => p.AddedBy)
            .FirstOrDefaultAsync(r => r.Hash == hash);

    public async Task<List<Room>> GetActiveRoomsAsync() =>
        await _context.Rooms
            .Include(r => r.Owner)
            .Where(r => r.IsActive)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

    public async Task AddAsync(Room room)
    {
        await _context.Rooms.AddAsync(room);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Room room)
    {
        if (_context.Entry(room).State == EntityState.Detached)
            _context.Rooms.Update(room);

        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Room room)
    {
        _context.Rooms.Remove(room);
        await _context.SaveChangesAsync();
    }
}
