using Microsoft.JSInterop;

namespace AssistaJunto.Client.Services;

public class AuthStateService
{
    private readonly IJSRuntime _js;
    private string? _username;

    public event Action? OnAuthStateChanged;

    public bool IsAuthenticated => _username is not null;
    public string? Username => _username;

    public AuthStateService(IJSRuntime js)
    {
        _js = js;
    }

    public async Task InitializeAsync()
    {
        _username = await _js.InvokeAsync<string?>("localStorage.getItem", "user_name");
    }

    public async Task SetUsernameAsync(string username)
    {
        _username = username;
        await _js.InvokeVoidAsync("localStorage.setItem", "user_name", username);
        OnAuthStateChanged?.Invoke();
    }

    public async Task LogoutAsync()
    {
        _username = null;
        await _js.InvokeVoidAsync("localStorage.removeItem", "user_name");
        OnAuthStateChanged?.Invoke();
    }
}
