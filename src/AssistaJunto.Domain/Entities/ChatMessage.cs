namespace AssistaJunto.Domain.Entities;

public class ChatMessage
{
    public Guid Id { get; private set; }
    public Guid RoomId { get; private set; }
    public string UserDisplayName { get; private set; } = string.Empty;
    public string Content { get; private set; } = string.Empty;
    public DateTime SentAt { get; private set; }

    private ChatMessage() { }

    public ChatMessage(Guid roomId, string userDisplayName, string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            throw new ArgumentException("Conteúdo da mensagem é obrigatório.", nameof(content));

        Id = Guid.NewGuid();
        RoomId = roomId;
        UserDisplayName = userDisplayName;
        Content = content.Trim();
        SentAt = DateTime.UtcNow;
    }
}
