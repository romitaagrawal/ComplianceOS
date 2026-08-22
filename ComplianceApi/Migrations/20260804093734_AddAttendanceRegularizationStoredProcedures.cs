using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ComplianceApi.Migrations
{
    /// <inheritdoc />
    public partial class AddAttendanceRegularizationStoredProcedures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE OR ALTER PROCEDURE sp_SubmitAttendanceRegularization
    @UserId INT,
    @AttendanceDate DATE,
    @Reason NVARCHAR(100),
    @OtherReasonText NVARCHAR(500) = NULL,
    @RequestedClockIn DATETIME2,
    @RequestedClockOut DATETIME2,
    @Remarks NVARCHAR(1000) = NULL,
    @NewId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;
    BEGIN TRY
        IF @AttendanceDate > CAST(SYSUTCDATETIME() AS DATE)
        BEGIN
            RAISERROR('Cannot regularize a future date.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        IF @AttendanceDate < DATEADD(DAY, -30, CAST(SYSUTCDATETIME() AS DATE))
        BEGIN
            RAISERROR('Only attendance within the last 30 days can be regularized.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        IF @RequestedClockOut <= @RequestedClockIn
        BEGIN
            RAISERROR('Clock-out time must be later than clock-in time.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        IF EXISTS (
            SELECT 1 FROM AttendanceRegularizations
            WHERE UserId = @UserId AND AttendanceDate = @AttendanceDate AND Status = 'Pending'
        )
        BEGIN
            RAISERROR('A pending regularization request already exists for this date.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        DECLARE @AttendanceLogId INT;
        DECLARE @OriginalClockIn DATETIME2;
        DECLARE @OriginalClockOut DATETIME2;

        SELECT TOP 1
            @AttendanceLogId = Id,
            @OriginalClockIn = ClockIn,
            @OriginalClockOut = ClockOut
        FROM AttendanceLogs
        WHERE UserId = @UserId AND CAST(ClockIn AS DATE) = @AttendanceDate;

        INSERT INTO AttendanceRegularizations
            (AttendanceLogId, UserId, AttendanceDate, OriginalClockIn, OriginalClockOut,
             RequestedClockIn, RequestedClockOut, Reason, OtherReasonText, Remarks,
             Status, SubmittedAt)
        VALUES
            (@AttendanceLogId, @UserId, @AttendanceDate, @OriginalClockIn, @OriginalClockOut,
             @RequestedClockIn, @RequestedClockOut, @Reason, @OtherReasonText, @Remarks,
             'Pending', SYSUTCDATETIME());

        SET @NewId = SCOPE_IDENTITY();
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END");

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

            migrationBuilder.Sql(@"
CREATE OR ALTER PROCEDURE sp_GetPendingRegularizationApprovals
    @SupervisorId INT
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
    WHERE u.ManagerId = @SupervisorId
      AND r.Status = 'Pending'
    ORDER BY r.SubmittedAt ASC;
END");

            migrationBuilder.Sql(@"
CREATE OR ALTER PROCEDURE sp_RecalculateAttendanceWorkingHours
    @AttendanceLogId INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ClockIn DATETIME2, @ClockOut DATETIME2, @Hours FLOAT;

    SELECT @ClockIn = ClockIn, @ClockOut = ClockOut
    FROM AttendanceLogs WHERE Id = @AttendanceLogId;

    IF @ClockOut IS NULL RETURN;

    SET @Hours = DATEDIFF(MINUTE, @ClockIn, @ClockOut) / 60.0;

    UPDATE AttendanceLogs
    SET TotalHours = @Hours,
        IsOvertimeFlagged = CASE WHEN @Hours > 8 THEN 1 ELSE 0 END
    WHERE Id = @AttendanceLogId;
END");

            migrationBuilder.Sql(@"
CREATE OR ALTER PROCEDURE sp_UpdateAttendanceFromRegularization
    @AttendanceLogId INT = NULL,
    @UserId INT,
    @NewClockIn DATETIME2,
    @NewClockOut DATETIME2,
    @ResultLogId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF @AttendanceLogId IS NULL
    BEGIN
        INSERT INTO AttendanceLogs (UserId, ClockIn, ClockOut, TotalHours, IsOvertimeFlagged)
        VALUES (@UserId, @NewClockIn, @NewClockOut, NULL, 0);
        SET @ResultLogId = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE AttendanceLogs
        SET ClockIn = @NewClockIn, ClockOut = @NewClockOut
        WHERE Id = @AttendanceLogId;
        SET @ResultLogId = @AttendanceLogId;
    END

    EXEC sp_RecalculateAttendanceWorkingHours @AttendanceLogId = @ResultLogId;
END");

            migrationBuilder.Sql(@"
CREATE OR ALTER PROCEDURE sp_ApproveAttendanceRegularization
    @RequestId INT,
    @ApproverId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @RequesterId INT, @RequesterManagerId INT, @Status NVARCHAR(20);
        DECLARE @AttendanceLogId INT, @RequestedClockIn DATETIME2, @RequestedClockOut DATETIME2;

        SELECT
            @RequesterId = r.UserId, @Status = r.Status, @AttendanceLogId = r.AttendanceLogId,
            @RequestedClockIn = r.RequestedClockIn, @RequestedClockOut = r.RequestedClockOut
        FROM AttendanceRegularizations r WHERE r.Id = @RequestId;

        IF @RequesterId IS NULL
        BEGIN
            RAISERROR('Regularization request not found.', 16, 1);
            ROLLBACK TRANSACTION; RETURN;
        END

        SELECT @RequesterManagerId = ManagerId FROM Users WHERE Id = @RequesterId;

        IF @RequesterManagerId IS NULL OR @RequesterManagerId <> @ApproverId
        BEGIN
            RAISERROR('You are not authorized to act on this request.', 16, 1);
            ROLLBACK TRANSACTION; RETURN;
        END

        IF @Status <> 'Pending'
        BEGIN
            RAISERROR('Only pending requests can be approved.', 16, 1);
            ROLLBACK TRANSACTION; RETURN;
        END

        DECLARE @ResultLogId INT;
        EXEC sp_UpdateAttendanceFromRegularization
            @AttendanceLogId = @AttendanceLogId, @UserId = @RequesterId,
            @NewClockIn = @RequestedClockIn, @NewClockOut = @RequestedClockOut,
            @ResultLogId = @ResultLogId OUTPUT;

        UPDATE AttendanceRegularizations
        SET Status = 'Approved', AttendanceLogId = @ResultLogId,
            DecidedAt = SYSUTCDATETIME(), DecidedByUserId = @ApproverId
        WHERE Id = @RequestId;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END");

            migrationBuilder.Sql(@"
CREATE OR ALTER PROCEDURE sp_RejectAttendanceRegularization
    @RequestId INT,
    @ApproverId INT,
    @RejectionReason NVARCHAR(1000)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @RequesterId INT, @RequesterManagerId INT, @Status NVARCHAR(20);

        SELECT @RequesterId = UserId, @Status = Status
        FROM AttendanceRegularizations WHERE Id = @RequestId;

        IF @RequesterId IS NULL
        BEGIN
            RAISERROR('Regularization request not found.', 16, 1);
            ROLLBACK TRANSACTION; RETURN;
        END

        SELECT @RequesterManagerId = ManagerId FROM Users WHERE Id = @RequesterId;

        IF @RequesterManagerId IS NULL OR @RequesterManagerId <> @ApproverId
        BEGIN
            RAISERROR('You are not authorized to act on this request.', 16, 1);
            ROLLBACK TRANSACTION; RETURN;
        END

        IF @Status <> 'Pending'
        BEGIN
            RAISERROR('Only pending requests can be rejected.', 16, 1);
            ROLLBACK TRANSACTION; RETURN;
        END

        IF @RejectionReason IS NULL OR LTRIM(RTRIM(@RejectionReason)) = ''
        BEGIN
            RAISERROR('A rejection reason is required.', 16, 1);
            ROLLBACK TRANSACTION; RETURN;
        END

        UPDATE AttendanceRegularizations
        SET Status = 'Rejected', RejectionReason = @RejectionReason,
            DecidedAt = SYSUTCDATETIME(), DecidedByUserId = @ApproverId
        WHERE Id = @RequestId;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END");

            migrationBuilder.Sql(@"
CREATE OR ALTER PROCEDURE sp_CancelAttendanceRegularization
    @RequestId INT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @OwnerId INT, @Status NVARCHAR(20);

    SELECT @OwnerId = UserId, @Status = Status
    FROM AttendanceRegularizations WHERE Id = @RequestId;

    IF @OwnerId IS NULL
    BEGIN
        RAISERROR('Regularization request not found.', 16, 1); RETURN;
    END

    IF @OwnerId <> @UserId
    BEGIN
        RAISERROR('You can only cancel your own requests.', 16, 1); RETURN;
    END

    IF @Status <> 'Pending'
    BEGIN
        RAISERROR('Only pending requests can be cancelled.', 16, 1); RETURN;
    END

    UPDATE AttendanceRegularizations SET Status = 'Cancelled' WHERE Id = @RequestId;
END");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_CancelAttendanceRegularization;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_RejectAttendanceRegularization;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_ApproveAttendanceRegularization;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_UpdateAttendanceFromRegularization;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_RecalculateAttendanceWorkingHours;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetPendingRegularizationApprovals;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetUserRegularizationHistory;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_SubmitAttendanceRegularization;");
        }
    }
}
