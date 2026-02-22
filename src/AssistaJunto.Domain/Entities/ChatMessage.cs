namespace AssistaJunto.Domain.Entities;

public class ChatMessage
{
    public Guid Id { get; private set; }
    public Guid RoomId { get; private set; }
    public Guid UserId { get; private set; }
    public User User { get; private set; } = null!;
    public string Content { get; private set; } = string.Empty;
    public DateTime SentAt { get; private set; }

    private ChatMessage() { }

    public ChatMessage(Guid roomId, Guid userId, string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            throw new ArgumentException("Conteúdo da mensagem é obrigatório.", nameof(content));

        Id = Guid.NewGuid();
        RoomId = roomId;
        UserId = userId;
        Content = content.Trim();
        SentAt = DateTime.UtcNow;
    }
}
