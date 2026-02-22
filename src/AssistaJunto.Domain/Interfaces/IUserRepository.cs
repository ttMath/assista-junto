using AssistaJunto.Domain.Entities;

namespace AssistaJunto.Domain.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id);
    Task<User?> GetByDiscordIdAsync(string discordId);
    Task AddAsync(User user);
    Task UpdateAsync(User user);
}
