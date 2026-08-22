namespace ComplianceApi.DTOs
{
    public class PasswordResetResponseDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string? EmployeeName { get; set; }
        public string? EmployeeEmail { get; set; }
        public string? EmployeeDisplayId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? RejectionReason { get; set; }
        public DateTime RequestedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public string? ResolvedByName { get; set; }
    }
}