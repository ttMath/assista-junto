using AssistaJunto.Domain.Entities;
using AssistaJunto.Domain.Interfaces;
using AssistaJunto.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AssistaJunto.Infrastructure.Repositories;

public class ChatMessageRepository : IChatMessageRepository
{
    private readonly AppDbContext _context;

    public ChatMessageRepository(AppDbContext context) => _context = context;

    public async Task<List<ChatMessage>> GetByRoomIdAsync(Guid roomId, int take = 50) =>
        await _context.ChatMessages
            .Include(m => m.User)
            .Where(m => m.RoomId == roomId)
            .OrderByDescending(m => m.SentAt)
            .Take(take)
            .OrderBy(m => m.SentAt)
            .ToListAsync();

    public async Task AddAsync(ChatMessage message)
    {
        await _context.ChatMessages.AddAsync(message);
        await _context.SaveChangesAsync();
    }
}
