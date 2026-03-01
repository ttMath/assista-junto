using AssistaJunto.Application.DTOs;
using AssistaJunto.Application.Interfaces;
using AssistaJunto.Domain.Entities;
using AssistaJunto.Domain.Interfaces;

namespace AssistaJunto.Application.Services;

public class ChatService : IChatService
{
    private readonly IChatMessageRepository _chatMessageRepository;
    private readonly IRoomRepository _roomRepository;

    public ChatService(
        IChatMessageRepository chatMessageRepository,
        IRoomRepository roomRepository)
    {
        _chatMessageRepository = chatMessageRepository;
        _roomRepository = roomRepository;
    }

    public async Task<ChatMessageDto> SendMessageAsync(string roomHash, string username, string content)
    {
        var room = await _roomRepository.GetByHashAsync(roomHash)
            ?? throw new InvalidOperationException("Sala não encontrada.");

        var message = new ChatMessage(room.Id, username, content);
        await _chatMessageRepository.AddAsync(message);

        return new ChatMessageDto(
            message.Id, message.UserDisplayName,
            message.Content, message.SentAt
        );
    }

    public async Task<List<ChatMessageDto>> GetRecentMessagesAsync(string roomHash, int take = 50)
    {
        var room = await _roomRepository.GetByHashAsync(roomHash)
            ?? throw new InvalidOperationException("Sala não encontrada.");

        var messages = await _chatMessageRepository.GetByRoomIdAsync(room.Id, take);

        return messages.Select(msg => new ChatMessageDto(
            msg.Id,
            msg.UserDisplayName,
            msg.Content,
            msg.SentAt
        )).ToList();
    }
}
