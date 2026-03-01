using AssistaJunto.Application.DTOs;

namespace AssistaJunto.Application.Interfaces;

public interface IChatService
{
    Task<ChatMessageDto> SendMessageAsync(string roomHash, string username, string content);
    Task<List<ChatMessageDto>> GetRecentMessagesAsync(string roomHash, int take = 50);
}
