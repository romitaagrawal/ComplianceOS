namespace ComplianceApi.Models
{
    public class AttendanceRegularization
    {
        public int Id { get; set; }

        // The attendance log this request corrects. Null when the user
        // missed the day entirely (no clock-in at all) — approval creates
        // a brand-new AttendanceLog in that case instead of updating one.
        public int? AttendanceLogId { get; set; }
        public AttendanceLog? AttendanceLog { get; set; }

        public int UserId { get; set; }
        public User? User { get; set; }

        public DateTime AttendanceDate { get; set; }

        // Snapshot of what was on the log (if anything) at submission time,
        // so the approver can see before/after even if the log changes later.
        public DateTime? OriginalClockIn { get; set; }
        public DateTime? OriginalClockOut { get; set; }

        public DateTime RequestedClockIn { get; set; }
        public DateTime RequestedClockOut { get; set; }

        public string Reason { get; set; } = string.Empty;
        public string? OtherReasonText { get; set; }
        public string? Remarks { get; set; }

        public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected, Cancelled

        public string? RejectionReason { get; set; }

        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DecidedAt { get; set; }

        public int? DecidedByUserId { get; set; }
        public User? DecidedByUser { get; set; }
    }
}