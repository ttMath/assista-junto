using System.Security.Claims;
using AssistaJunto.Application.DTOs;
using AssistaJunto.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AssistaJunto.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IConfiguration _configuration;

    public AuthController(IAuthService authService, IConfiguration configuration)
    {
        _authService = authService;
        _configuration = configuration;
    }

    [HttpGet("discord")]
    public IActionResult RedirectToDiscord()
    {
        var url = _authService.GetDiscordOAuthUrl();
        return Redirect(url);
    }

    [HttpGet("callback")]
    public async Task<IActionResult> Callback([FromQuery] string? code, [FromQuery] string? error)
    {
        var clientUrl = _configuration["ClientUrl"] ?? "https://localhost:7036";

        if (!string.IsNullOrWhiteSpace(error))
            return Redirect($"{clientUrl}/auth/callback?error={Uri.EscapeDataString(error)}");

        if (string.IsNullOrWhiteSpace(code))
            return Redirect($"{clientUrl}/auth/callback?error=missing_code");

        try
        {
            var token = await _authService.HandleCallbackAsync(code);
            return Redirect($"{clientUrl}/auth/callback?token={token}");
        }
        catch (Exception ex)
        {
            return Redirect($"{clientUrl}/auth/callback?error={Uri.EscapeDataString(ex.Message)}");
        }
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var user = await _authService.GetCurrentUserAsync(userId);
        return user is not null ? Ok(user) : NotFound();
    }

    [Authorize]
    [HttpPut("nickname")]
    public async Task<IActionResult> UpdateNickname([FromBody] UpdateNicknameRequest request)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var user = await _authService.UpdateNicknameAsync(userId, request.Nickname);
        return user is not null ? Ok(user) : NotFound();
    }
}
