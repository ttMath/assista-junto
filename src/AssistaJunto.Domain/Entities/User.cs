namespace AssistaJunto.Domain.Entities;

public class User
{
    public Guid Id { get; private set; }
    public string DiscordId { get; private set; } = string.Empty;
    public string DiscordUsername { get; private set; } = string.Empty;
    public string AvatarUrl { get; private set; } = string.Empty;
    public string? Nickname { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime LastLoginAt { get; private set; }

    private User() { }

    public User(string discordId, string discordUsername, string avatarUrl)
    {
        if (string.IsNullOrWhiteSpace(discordId))
            throw new ArgumentException("Discord ID é obrigatório.", nameof(discordId));
        if (string.IsNullOrWhiteSpace(discordUsername))
            throw new ArgumentException("Username do Discord é obrigatório.", nameof(discordUsername));

        Id = Guid.NewGuid();
        DiscordId = discordId;
        DiscordUsername = discordUsername;
        AvatarUrl = avatarUrl;
        CreatedAt = DateTime.UtcNow;
        LastLoginAt = DateTime.UtcNow;
    }

    public void UpdateProfile(string discordUsername, string avatarUrl)
    {
        DiscordUsername = discordUsername;
        AvatarUrl = avatarUrl;
        LastLoginAt = DateTime.UtcNow;
    }

    public void SetNickname(string? nickname)
    {
        Nickname = string.IsNullOrWhiteSpace(nickname) ? null : nickname.Trim();
    }

    public string DisplayName => Nickname ?? DiscordUsername;
}
