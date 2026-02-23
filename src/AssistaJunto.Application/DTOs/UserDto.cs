namespace AssistaJunto.Application.DTOs;

public record UserDto(
    Guid Id,
    string DiscordId,
    string DiscordUsername,
    string AvatarUrl,
    string? Nickname,
    string DisplayName
);

public record UpdateNicknameRequest(string? Nickname);

public record RoomUserInfo(string DisplayName, string AvatarUrl);
