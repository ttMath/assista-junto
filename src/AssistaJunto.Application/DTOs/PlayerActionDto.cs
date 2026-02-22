using AssistaJunto.Domain.Enums;

namespace AssistaJunto.Application.DTOs;

public record PlayerActionDto(
    PlayerAction Action,
    double? SeekTime,
    string? VideoId
);
