namespace AssistaJunto.Application.DTOs;

public record ChatMessageDto(
    Guid Id,
    string UserDisplayName,
    string UserAvatarUrl,
    string Content,
    DateTime SentAt
);

public record SendChatMessageRequest(string Content);
