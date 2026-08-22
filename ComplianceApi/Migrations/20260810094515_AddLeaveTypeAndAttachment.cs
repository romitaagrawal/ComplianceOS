using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ComplianceApi.Migrations
{
    /// <inheritdoc />
    public partial class AddLeaveTypeAndAttachment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AttachmentContentType",
                table: "LeaveRequests",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AttachmentFileName",
                table: "LeaveRequests",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "AttachmentSizeBytes",
                table: "LeaveRequests",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AttachmentStoredName",
                table: "LeaveRequests",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "AttachmentUploadedAt",
                table: "LeaveRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LeaveType",
                table: "LeaveRequests",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AttachmentContentType",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "AttachmentFileName",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "AttachmentSizeBytes",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "AttachmentStoredName",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "AttachmentUploadedAt",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "LeaveType",
                table: "LeaveRequests");
        }
    }
}
