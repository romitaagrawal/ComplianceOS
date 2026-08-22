using Microsoft.Data.SqlClient;
using ComplianceApi.DTOs;
using ComplianceApi.Repositories;

namespace ComplianceApi.Services
{
    public class AttendanceRegularizationService : IAttendanceRegularizationService
    {
        private readonly IAttendanceRegularizationRepository _repo;

        private static readonly string[] ValidReasons =
        {
            "Forgot to Clock In", "Forgot to Clock Out", "Missed Both Clock In & Clock Out",
            "Biometric/Clocking Device Failure", "Network/Application Issue",
            "Official Off-site Duty", "Client Visit", "Business Travel",
            "Work From Home Attendance Issue", "Other"
        };

        public AttendanceRegularizationService(IAttendanceRegularizationRepository repo)
        {
            _repo = repo;
        }

        public (bool Success, string Message, int? NewId) SubmitRequest(int userId, RegularizationSubmitDto dto)
        {
            if (!ValidReasons.Contains(dto.Reason))
                return (false, "Please choose a valid reason.", null);

            if (dto.Reason == "Other" && string.IsNullOrWhiteSpace(dto.OtherReasonText))
                return (false, "Please explain the reason when selecting 'Other'.", null);

            if (dto.RequestedClockOut <= dto.RequestedClockIn)
                return (false, "Clock-out time must be later than clock-in time.", null);

            var today = DateTime.UtcNow.Date;
            if (dto.AttendanceDate.Date > today)
                return (false, "Cannot regularize a future date.", null);

            if (dto.AttendanceDate.Date < today.AddDays(-30))
                return (false, "Only attendance within the last 30 days can be regularized.", null);

            try
            {
                var newId = _repo.SubmitRequest(
                    userId, dto.AttendanceDate.Date, dto.Reason, dto.OtherReasonText,
                    dto.RequestedClockIn, dto.RequestedClockOut, dto.Remarks);

                return (true, "Regularization request submitted.", newId);
            }
            catch (SqlException ex)
            {
                // RAISERROR messages from the SP surface here verbatim.
                return (false, ex.Message, null);
            }
        }

        public (List<RegularizationResponseDto> Items, int TotalCount) GetMyHistory(int userId, int page, int pageSize)
    => _repo.GetUserHistory(userId, page, pageSize);

        public List<RegularizationResponseDto> GetPendingApprovals(int supervisorId) => _repo.GetPendingApprovals(supervisorId);

        public (bool Success, string Message) Approve(int requestId, int approverId)
        {
            try
            {
                _repo.ApproveRequest(requestId, approverId);
                return (true, "Request approved and attendance updated.");
            }
            catch (SqlException ex)
            {
                return (false, ex.Message);
            }
        }

        public (bool Success, string Message) Reject(int requestId, int approverId, string rejectionReason)
        {
            if (string.IsNullOrWhiteSpace(rejectionReason))
                return (false, "A rejection reason is required.");

            try
            {
                _repo.RejectRequest(requestId, approverId, rejectionReason);
                return (true, "Request rejected.");
            }
            catch (SqlException ex)
            {
                return (false, ex.Message);
            }
        }

        public (bool Success, string Message) Cancel(int requestId, int userId)
        {
            try
            {
                _repo.CancelRequest(requestId, userId);
                return (true, "Request cancelled.");
            }
            catch (SqlException ex)
            {
                return (false, ex.Message);
            }
        }
    }
}