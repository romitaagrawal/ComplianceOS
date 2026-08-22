namespace ComplianceApi.DTOs
{
    public class PasswordResetActionDto
    {
        public string Action { get; set; } = string.Empty; // "Reset" or "Reject"
        public string? RejectionReason { get; set; }
    }
}