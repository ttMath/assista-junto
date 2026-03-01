namespace Pipoca.Bot.Models
{
    public record RoomCreatedResult(bool Success, string? ErrorMessage, string? RoomUrl);
}
