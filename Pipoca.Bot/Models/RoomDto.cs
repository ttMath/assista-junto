namespace Pipoca.Bot.Models
{
    public record RoomDto
    {
        public Guid Id { get; set; }
        public string Hash { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
    }
}
