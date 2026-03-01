using System;
using System.Collections.Generic;
using System.Text;

namespace Pipoca.Bot.Models
{
    public record RoomsListResult(bool Success, List<RoomInfo> Rooms, string? ErrorMessage);
}
