using AssistaJunto.Application.DTOs;
using AssistaJunto.Application.Interfaces;
using AssistaJunto.Domain.Entities;
using AssistaJunto.Domain.Interfaces;

namespace AssistaJunto.Application.Services;

public class ChatService : IChatService
{
    private readonly IChatMessageRepository _chatMessageRepository;
    private readonly IRoomRepository _roomRepository;
    private readonly IUserRepository _userRepository;

    public ChatService(
        IChatMessageRepository chatMessageRepository,
        IRoomRepository roomRepository,
        IUserRepository userRepository)
    {
        _chatMessageRepository = chatMessageRepository;
        _roomRepository = roomRepository;
        _userRepository = userRepository;
    }

    public async Task<ChatMessageDto> SendMessageAsync(string roomHash, Guid userId, string content)
    {
        var room = await _roomRepository.GetByHashAsync(roomHash)
            ?? throw new InvalidOperationException("Sala não encontrada.");

        var user = await _userRepository.GetByIdAsync(userId)
            ?? throw new InvalidOperationException("Usuário não encontrado.");

        var message = new ChatMessage(room.Id, userId, content);
        await _chatMessageRepository.AddAsync(message);

        return new ChatMessageDto(
            message.Id, user.DisplayName, user.AvatarUrl,
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
            msg.User?.DisplayName ?? "Desconhecido",
            msg.User?.AvatarUrl ?? "",
            msg.Content,
            msg.SentAt
        )).ToList();
    }
}
