namespace AssistaJunto.Client.Models;

public class UserModel
{
    public Guid Id { get; set; }
    public string DiscordId { get; set; } = string.Empty;
    public string DiscordUsername { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public string? Nickname { get; set; }
    public string DisplayName { get; set; } = string.Empty;
}

public class AuthToken
{
    public string Token { get; set; } = string.Empty;
}
