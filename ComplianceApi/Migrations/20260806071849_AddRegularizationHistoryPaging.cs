using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ComplianceApi.Migrations
{
    /// <inheritdoc />
    public partial class AddRegularizationHistoryPaging : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE OR ALTER PROCEDURE sp_GetUserRegularizationHistory
    @UserId INT,
    @PageNumber INT = 1,
    @PageSize INT = 10,
    @TotalCount INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT @TotalCount = COUNT(*) FROM AttendanceRegularizations WHERE UserId = @UserId;

    SELECT
        r.Id, r.AttendanceLogId, r.UserId,
        u.FullName AS EmployeeName, u.DisplayId AS EmployeeDisplayId, u.Role AS EmployeeRole,
        r.AttendanceDate, r.OriginalClockIn, r.OriginalClockOut,
        r.RequestedClockIn, r.RequestedClockOut,
        r.Reason, r.OtherReasonText, r.Remarks,
        r.Status, r.RejectionReason,
        r.SubmittedAt, r.DecidedAt,
        d.FullName AS DecidedByName
    FROM AttendanceRegularizations r
    INNER JOIN Users u ON u.Id = r.UserId
    LEFT JOIN Users d ON d.Id = r.DecidedByUserId
    WHERE r.UserId = @UserId
    ORDER BY r.SubmittedAt DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Restores the pre-paging version so Down() isn't a dead end.
            migrationBuilder.Sql(@"
CREATE OR ALTER PROCEDURE sp_GetUserRegularizationHistory
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        r.Id, r.AttendanceLogId, r.UserId,
        u.FullName AS EmployeeName, u.DisplayId AS EmployeeDisplayId, u.Role AS EmployeeRole,
        r.AttendanceDate, r.OriginalClockIn, r.OriginalClockOut,
        r.RequestedClockIn, r.RequestedClockOut,
        r.Reason, r.OtherReasonText, r.Remarks,
        r.Status, r.RejectionReason,
        r.SubmittedAt, r.DecidedAt,
        d.FullName AS DecidedByName
    FROM AttendanceRegularizations r
    INNER JOIN Users u ON u.Id = r.UserId
    LEFT JOIN Users d ON d.Id = r.DecidedByUserId
    WHERE r.UserId = @UserId
    ORDER BY r.SubmittedAt DESC;
END");
        }
    }
}
