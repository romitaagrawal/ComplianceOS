namespace ComplianceApi.Models
{
    public class PasswordResetRequest
    {
        public int Id { get; set; }

        public int UserId { get; set; }
        public User? User { get; set; }

        public string Status { get; set; } = "Pending"; // Pending, Reset, Rejected
        public string? RejectionReason { get; set; }

        public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedAt { get; set; }

        public int? ResolvedByUserId { get; set; }
        public User? ResolvedByUser { get; set; }
    }
}