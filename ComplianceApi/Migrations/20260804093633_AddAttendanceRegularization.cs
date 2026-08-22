using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ComplianceApi.Migrations
{
    /// <inheritdoc />
    public partial class AddAttendanceRegularization : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AttendanceRegularizations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AttendanceLogId = table.Column<int>(type: "int", nullable: true),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    AttendanceDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    OriginalClockIn = table.Column<DateTime>(type: "datetime2", nullable: true),
                    OriginalClockOut = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RequestedClockIn = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RequestedClockOut = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OtherReasonText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RejectionReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DecidedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DecidedByUserId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AttendanceRegularizations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AttendanceRegularizations_AttendanceLogs_AttendanceLogId",
                        column: x => x.AttendanceLogId,
                        principalTable: "AttendanceLogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AttendanceRegularizations_Users_DecidedByUserId",
                        column: x => x.DecidedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AttendanceRegularizations_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceRegularizations_AttendanceLogId",
                table: "AttendanceRegularizations",
                column: "AttendanceLogId");

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceRegularizations_DecidedByUserId",
                table: "AttendanceRegularizations",
                column: "DecidedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceRegularizations_UserId",
                table: "AttendanceRegularizations",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AttendanceRegularizations");
        }
    }
}
