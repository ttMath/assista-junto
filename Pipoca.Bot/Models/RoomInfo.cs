using System;
using System.Collections.Generic;
using System.Text;

namespace Pipoca.Bot.Models
{
    public record RoomInfo
    {
        public string Hash { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string OwnerDisplayName { get; set; } = string.Empty;
        public int UsersCount { get; set; }
        public bool IsActive { get; set; }
        public string Url { get; set; } = string.Empty;
    }
}
