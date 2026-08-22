using Microsoft.AspNetCore.Http;

namespace ComplianceApi.DTOs
{
    public class LeaveRequestDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string LeaveType { get; set; } = string.Empty;
        public string? Reason { get; set; }
        public IFormFile? Attachment { get; set; }
    }
}