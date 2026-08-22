namespace ComplianceApi.DTOs
{
    public class LeaveResponseDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string? EmployeeName { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public string LeaveType { get; set; } = string.Empty;
        public string? Reason { get; set; }
        public bool HasAttachment { get; set; }
        public string? AttachmentFileName { get; set; }
    }
}