using AssistaJunto.Domain.Entities;

namespace AssistaJunto.Domain.Interfaces;

public interface IChatMessageRepository
{
    Task<List<ChatMessage>> GetByRoomIdAsync(Guid roomId, int take = 50);
    Task AddAsync(ChatMessage message);
}
