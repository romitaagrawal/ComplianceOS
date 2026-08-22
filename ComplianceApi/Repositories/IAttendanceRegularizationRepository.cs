using ComplianceApi.DTOs;

namespace ComplianceApi.Repositories
{
    public interface IAttendanceRegularizationRepository
    {
        int SubmitRequest(int userId, DateTime attendanceDate, string reason, string? otherReasonText,
            DateTime requestedClockIn, DateTime requestedClockOut, string? remarks);

        (List<RegularizationResponseDto> Items, int TotalCount) GetUserHistory(int userId, int page, int pageSize);

        List<RegularizationResponseDto> GetPendingApprovals(int supervisorId);

        void ApproveRequest(int requestId, int approverId);

        void RejectRequest(int requestId, int approverId, string rejectionReason);

        void CancelRequest(int requestId, int userId);
    }
}