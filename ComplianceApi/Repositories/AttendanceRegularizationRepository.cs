using System.Data;
using Microsoft.Data.SqlClient;
using ComplianceApi.DTOs;

namespace ComplianceApi.Repositories
{
    // Deliberately plain ADO.NET, not EF — this is the one place in the app
    // that talks to SQL Server via stored procedures instead of LINQ, per
    // the requirement. Every method opens its own short-lived connection.
    public class AttendanceRegularizationRepository : IAttendanceRegularizationRepository
    {
        private readonly string _connectionString;

        public AttendanceRegularizationRepository(IConfiguration config)
        {
            _connectionString = config.GetConnectionString("DefaultConnection")!;
        }

        private SqlConnection OpenConnection()
        {
            var conn = new SqlConnection(_connectionString);
            conn.Open();
            return conn;
        }

        public int SubmitRequest(int userId, DateTime attendanceDate, string reason, string? otherReasonText,
            DateTime requestedClockIn, DateTime requestedClockOut, string? remarks)
        {
            using var conn = OpenConnection();
            using var cmd = new SqlCommand("sp_SubmitAttendanceRegularization", conn) { CommandType = CommandType.StoredProcedure };

            cmd.Parameters.AddWithValue("@UserId", userId);
            cmd.Parameters.AddWithValue("@AttendanceDate", attendanceDate.Date);
            cmd.Parameters.AddWithValue("@Reason", reason);
            cmd.Parameters.AddWithValue("@OtherReasonText", (object?)otherReasonText ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@RequestedClockIn", requestedClockIn);
            cmd.Parameters.AddWithValue("@RequestedClockOut", requestedClockOut);
            cmd.Parameters.AddWithValue("@Remarks", (object?)remarks ?? DBNull.Value);

            var newIdParam = new SqlParameter("@NewId", SqlDbType.Int) { Direction = ParameterDirection.Output };
            cmd.Parameters.Add(newIdParam);

            cmd.ExecuteNonQuery();
            return (int)newIdParam.Value;
        }

        public (List<RegularizationResponseDto> Items, int TotalCount) GetUserHistory(int userId, int page, int pageSize)
        {
            using var conn = OpenConnection();
            using var cmd = new SqlCommand("sp_GetUserRegularizationHistory", conn) { CommandType = CommandType.StoredProcedure };
            cmd.Parameters.AddWithValue("@UserId", userId);
            cmd.Parameters.AddWithValue("@PageNumber", page);
            cmd.Parameters.AddWithValue("@PageSize", pageSize);
            var totalParam = new SqlParameter("@TotalCount", SqlDbType.Int) { Direction = ParameterDirection.Output };
            cmd.Parameters.Add(totalParam);

            List<RegularizationResponseDto> items;
            using (var reader = cmd.ExecuteReader())
            {
                items = MapReaderToList(reader);
            } // output params only populate once the reader is closed — that's why this is its own block

            var totalCount = totalParam.Value == DBNull.Value ? 0 : (int)totalParam.Value;
            return (items, totalCount);
        }

        public List<RegularizationResponseDto> GetPendingApprovals(int supervisorId)
        {
            using var conn = OpenConnection();
            using var cmd = new SqlCommand("sp_GetPendingRegularizationApprovals", conn) { CommandType = CommandType.StoredProcedure };
            cmd.Parameters.AddWithValue("@SupervisorId", supervisorId);
            using var reader = cmd.ExecuteReader();
            return MapReaderToList(reader);
        }

        public void ApproveRequest(int requestId, int approverId)
        {
            using var conn = OpenConnection();
            using var cmd = new SqlCommand("sp_ApproveAttendanceRegularization", conn) { CommandType = CommandType.StoredProcedure, CommandTimeout = 60 };
            cmd.Parameters.AddWithValue("@RequestId", requestId);
            cmd.Parameters.AddWithValue("@ApproverId", approverId);
            cmd.ExecuteNonQuery();
        }

        public void RejectRequest(int requestId, int approverId, string rejectionReason)
        {
            using var conn = OpenConnection();
            using var cmd = new SqlCommand("sp_RejectAttendanceRegularization", conn) { CommandType = CommandType.StoredProcedure };
            cmd.Parameters.AddWithValue("@RequestId", requestId);
            cmd.Parameters.AddWithValue("@ApproverId", approverId);
            cmd.Parameters.AddWithValue("@RejectionReason", rejectionReason);
            cmd.ExecuteNonQuery();
        }

        public void CancelRequest(int requestId, int userId)
        {
            using var conn = OpenConnection();
            using var cmd = new SqlCommand("sp_CancelAttendanceRegularization", conn) { CommandType = CommandType.StoredProcedure };
            cmd.Parameters.AddWithValue("@RequestId", requestId);
            cmd.Parameters.AddWithValue("@UserId", userId);
            cmd.ExecuteNonQuery();
        }

        private static List<RegularizationResponseDto> MapReaderToList(SqlDataReader reader)
        {
            var list = new List<RegularizationResponseDto>();
            while (reader.Read())
            {
                list.Add(new RegularizationResponseDto
                {
                    Id = reader.GetInt32(reader.GetOrdinal("Id")),
                    AttendanceLogId = reader["AttendanceLogId"] as int?,
                    UserId = reader.GetInt32(reader.GetOrdinal("UserId")),
                    EmployeeName = reader["EmployeeName"] as string,
                    EmployeeDisplayId = reader["EmployeeDisplayId"] as string,
                    EmployeeRole = reader["EmployeeRole"] as string,
                    AttendanceDate = reader.GetDateTime(reader.GetOrdinal("AttendanceDate")),
                    OriginalClockIn = reader["OriginalClockIn"] as DateTime?,
                    OriginalClockOut = reader["OriginalClockOut"] as DateTime?,
                    RequestedClockIn = reader.GetDateTime(reader.GetOrdinal("RequestedClockIn")),
                    RequestedClockOut = reader.GetDateTime(reader.GetOrdinal("RequestedClockOut")),
                    Reason = reader["Reason"] as string ?? string.Empty,
                    OtherReasonText = reader["OtherReasonText"] as string,
                    Remarks = reader["Remarks"] as string,
                    Status = reader["Status"] as string ?? string.Empty,
                    RejectionReason = reader["RejectionReason"] as string,
                    SubmittedAt = reader.GetDateTime(reader.GetOrdinal("SubmittedAt")),
                    DecidedAt = reader["DecidedAt"] as DateTime?,
                    DecidedByName = reader["DecidedByName"] as string
                });
            }
            return list;
        }
    }
}