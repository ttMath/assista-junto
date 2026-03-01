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

    public User(string username)
    {
        if (string.IsNullOrWhiteSpace(username))
            throw new ArgumentException("Nome de usuário é obrigatório.", nameof(username));

        Id = Guid.NewGuid();
        DiscordId = Guid.NewGuid().ToString();
        DiscordUsername = username.Trim();
        AvatarUrl = string.Empty;
        CreatedAt = DateTime.UtcNow;
        LastLoginAt = DateTime.UtcNow;
    }

    public void UpdateLastLogin()
    {
        LastLoginAt = DateTime.UtcNow;
    }

    public string DisplayName => Nickname ?? DiscordUsername;
}
