namespace ComplianceApi.DTOs
{
    public class TaskCreateDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Priority { get; set; } = "Medium"; // Low, Medium, High
        public DateTime? Deadline { get; set; }
        public int AssignedToUserId { get; set; }
    }
}