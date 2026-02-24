using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AssistaJunto.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class UserCountAddOnRoom : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UsersCount",
                table: "Rooms",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UsersCount",
                table: "Rooms");
        }
    }
}
