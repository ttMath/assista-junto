using System.Net.Http.Json;
using AssistaJunto.Client.Models;
using Microsoft.JSInterop;

namespace AssistaJunto.Client.Services;

public class AuthStateService
{
    private readonly IJSRuntime _js;
    private string? _token;
    private UserModel? _currentUser;

    public event Action? OnAuthStateChanged;

    public bool IsAuthenticated => _token is not null;
    public UserModel? CurrentUser => _currentUser;
    public string? Token => _token;

    public AuthStateService(IJSRuntime js)
    {
        _js = js;
    }

    public async Task InitializeAsync()
    {
        _token = await _js.InvokeAsync<string?>("localStorage.getItem", "auth_token");
    }

    public async Task SetTokenAsync(string token)
    {
        _token = token;
        await _js.InvokeVoidAsync("localStorage.setItem", "auth_token", token);
        OnAuthStateChanged?.Invoke();
    }

    public async Task LogoutAsync()
    {
        _token = null;
        _currentUser = null;
        await _js.InvokeVoidAsync("localStorage.removeItem", "auth_token");
        OnAuthStateChanged?.Invoke();
    }

    public void SetCurrentUser(UserModel user)
    {
        _currentUser = user;
        OnAuthStateChanged?.Invoke();
    }
}
