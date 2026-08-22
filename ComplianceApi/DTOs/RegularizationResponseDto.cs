namespace ComplianceApi.DTOs
{
    public class RegularizationResponseDto
    {
        public int Id { get; set; }
        public int? AttendanceLogId { get; set; }
        public int UserId { get; set; }
        public string? EmployeeName { get; set; }
        public string? EmployeeDisplayId { get; set; }
        public string? EmployeeRole { get; set; }

        public DateTime AttendanceDate { get; set; }
        public DateTime? OriginalClockIn { get; set; }
        public DateTime? OriginalClockOut { get; set; }
        public DateTime RequestedClockIn { get; set; }
        public DateTime RequestedClockOut { get; set; }

        public string Reason { get; set; } = string.Empty;
        public string? OtherReasonText { get; set; }
        public string? Remarks { get; set; }

        public string Status { get; set; } = string.Empty;
        public string? RejectionReason { get; set; }

        public DateTime SubmittedAt { get; set; }
        public DateTime? DecidedAt { get; set; }
        public string? DecidedByName { get; set; }
    }
}