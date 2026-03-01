using Microsoft.Extensions.Configuration;
using NetCord.Services.ApplicationCommands;
using Pipoca.Bot.Models;
using Pipoca.Bot.Services;

namespace Pipoca.Bot.Modules;

public class RoomModule(AssistaJuntoApiClient apiClient, IConfiguration configuration) : ApplicationCommandModule<ApplicationCommandContext>
{
    private readonly string _clientUrl = configuration["ClientUrl"] ?? Environment.GetEnvironmentVariable("ClientUrl") ?? "https://localhost:7036";
    [SlashCommand("criar-sala", "Cria uma nova sala no AssistaJunto")]
    public async Task<string> CreateRoomAsync(string nome, string? senha = null)
    {
        try
        {
            var request = new CreateRoomRequest(nome, senha);
            var result = await apiClient.CreateRoomAsync(request);
            if (result.Success && result.RoomUrl is not null)
            {
                return $"✅ Sala **{nome}** criada com sucesso!\nAcesse: {result.RoomUrl}";
            }

            return $"❌ Erro ao criar sala: {result.ErrorMessage ?? "Desconhecido"}";
        }
        catch (Exception ex)
        {
            return $"❌ Falha na conexão: {ex.Message}";
        }
    }
    [SlashCommand("listar-salas", "Lista todas as salas ativas")]
    public async Task<string> ListRoomsAsync()
    {
        try
        {
            var result = await apiClient.GetActiveRoomsAsync();

            if (!result.Success)
                return $"❌ Erro ao buscar salas: {result.ErrorMessage}";

            if (result.Rooms.Count == 0)
                return "📭 Nenhuma sala ativa no momento.";

            var response = "📋 **Salas Ativas:**\n\n";

            foreach (var room in result.Rooms)
            {
                var roomUrl = room.Url;
                response += $"🎬 **{room.Name}**\n" +
                           $"   👤 Anfitrião: {room.OwnerDisplayName}\n" +
                           $"   👥 Usuários: {room.UsersCount}\n" +
                           $"   🔗 [{room.Hash}](<{roomUrl}>)\n\n";
            }

            return response;
        }
        catch (Exception ex)
        {
            return $"❌ Erro ao listar salas: {ex.Message}";
        }
    }

    [SlashCommand("deletar-sala", "Deleta uma sala pelo nome (apenas o dono pode deletar)")]
    public async Task<string> DeleteRoomAsync(string nome)
    {
        try
        {
            // Busca a sala pelo nome
            var deleteByNameResult = await apiClient.DeleteRoomByNameAsync(nome);
            if (deleteByNameResult.Success)
                return $"✅ Sala **{nome}** deletada com sucesso!";
            return $"❌ Erro ao deletar sala: {deleteByNameResult.ErrorMessage}";
        }
        catch (Exception ex)
        {
            return $"❌ Falha ao deletar sala: {ex.Message}";
        }
    }
}