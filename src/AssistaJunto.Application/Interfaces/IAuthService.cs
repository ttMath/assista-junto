using AssistaJunto.Application.DTOs;

namespace AssistaJunto.Application.Interfaces;

public interface IAuthService
{
    string GetDiscordOAuthUrl();
    Task<string> HandleCallbackAsync(string code);
    Task<UserDto?> GetCurrentUserAsync(Guid userId);
    Task<UserDto?> UpdateNicknameAsync(Guid userId, string? nickname);
}
