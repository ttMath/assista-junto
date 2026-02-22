using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using AssistaJunto.Application.DTOs;
using AssistaJunto.Application.Interfaces;
using AssistaJunto.Domain.Entities;
using AssistaJunto.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace AssistaJunto.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;

    public AuthService(
        IUserRepository userRepository,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory)
    {
        _userRepository = userRepository;
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
    }

    public string GetDiscordOAuthUrl()
    {
        var clientId = _configuration["Discord:ClientId"];
        var redirectUri = Uri.EscapeDataString(_configuration["Discord:RedirectUri"]!);
        return $"https://discord.com/api/oauth2/authorize?client_id={clientId}&response_type=code&redirect_uri={redirectUri}&scope=email+openid+identify+guilds";
    }

    public async Task<string> HandleCallbackAsync(string code)
    {
        var httpClient = _httpClientFactory.CreateClient();

        var tokenResponse = await ExchangeCodeForTokenAsync(httpClient, code);
        var discordUser = await GetDiscordUserAsync(httpClient, tokenResponse.AccessToken);

        var avatarUrl = discordUser.Avatar is not null
            ? $"https://cdn.discordapp.com/avatars/{discordUser.Id}/{discordUser.Avatar}.png"
            : $"https://cdn.discordapp.com/embed/avatars/{int.Parse(discordUser.Discriminator ?? "0") % 5}.png";

        var user = await _userRepository.GetByDiscordIdAsync(discordUser.Id);

        if (user is null)
        {
            user = new User(discordUser.Id, discordUser.Username, avatarUrl);
            await _userRepository.AddAsync(user);
        }
        else
        {
            user.UpdateProfile(discordUser.Username, avatarUrl);
            await _userRepository.UpdateAsync(user);
        }

        return GenerateJwtToken(user);
    }

    public async Task<UserDto?> GetCurrentUserAsync(Guid userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user is null) return null;

        return new UserDto(
            user.Id, user.DiscordId, user.DiscordUsername,
            user.AvatarUrl, user.Nickname, user.DisplayName
        );
    }

    public async Task<UserDto?> UpdateNicknameAsync(Guid userId, string? nickname)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user is null) return null;

        user.SetNickname(nickname);
        await _userRepository.UpdateAsync(user);

        return new UserDto(
            user.Id, user.DiscordId, user.DiscordUsername,
            user.AvatarUrl, user.Nickname, user.DisplayName
        );
    }

    private async Task<DiscordTokenResponse> ExchangeCodeForTokenAsync(HttpClient httpClient, string code)
    {
        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = _configuration["Discord:ClientId"]!,
            ["client_secret"] = _configuration["Discord:ClientSecret"]!,
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["redirect_uri"] = _configuration["Discord:RedirectUri"]!
        });

        var response = await httpClient.PostAsync("https://discord.com/api/oauth2/token", content);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<DiscordTokenResponse>())!;
    }

    private static async Task<DiscordUserResponse> GetDiscordUserAsync(HttpClient httpClient, string accessToken)
    {
        httpClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

        var response = await httpClient.GetAsync("https://discord.com/api/users/@me");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<DiscordUserResponse>())!;
    }

    private string GenerateJwtToken(User user)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:Secret"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim("discord_id", user.DiscordId),
            new Claim(ClaimTypes.Name, user.DisplayName)
        };

        var expirationHours = int.Parse(_configuration["Jwt:ExpirationInHours"] ?? "24");

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expirationHours),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private sealed class DiscordTokenResponse
    {
        [JsonPropertyName("access_token")]
        public string AccessToken { get; set; } = string.Empty;

        [JsonPropertyName("token_type")]
        public string TokenType { get; set; } = string.Empty;
    }

    private sealed class DiscordUserResponse
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("username")]
        public string Username { get; set; } = string.Empty;

        [JsonPropertyName("discriminator")]
        public string? Discriminator { get; set; }

        [JsonPropertyName("avatar")]
        public string? Avatar { get; set; }
    }
}
