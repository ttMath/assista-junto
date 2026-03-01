using AssistaJunto.Domain.Entities;
using AssistaJunto.Domain.Interfaces;
using AssistaJunto.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AssistaJunto.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _context;

    public UserRepository(AppDbContext context) => _context = context;

    public async Task<User?> GetByIdAsync(Guid id) =>
        await _context.Users.FindAsync(id);

    public async Task<User?> GetByUsernameAsync(string username) =>
        await _context.Users.FirstOrDefaultAsync(u => u.DiscordUsername == username);

    public async Task AddAsync(User user)
    {
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(User user)
    {
        if (_context.Entry(user).State == EntityState.Detached)
            _context.Users.Update(user);

        await _context.SaveChangesAsync();
    }
}
