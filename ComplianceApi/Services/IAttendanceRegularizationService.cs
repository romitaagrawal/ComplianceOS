using ComplianceApi.DTOs;

namespace ComplianceApi.Services
{
    public interface IAttendanceRegularizationService
    {
        (bool Success, string Message, int? NewId) SubmitRequest(int userId, RegularizationSubmitDto dto);
        (List<RegularizationResponseDto> Items, int TotalCount) GetMyHistory(int userId, int page, int pageSize);
        List<RegularizationResponseDto> GetPendingApprovals(int supervisorId);
        (bool Success, string Message) Approve(int requestId, int approverId);
        (bool Success, string Message) Reject(int requestId, int approverId, string rejectionReason);
        (bool Success, string Message) Cancel(int requestId, int userId);
    }
}