namespace ComplianceApi.DTOs
{
    public class EmployeeListItemDto
    {
        public int Id { get; set; }
        public string? DisplayId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string AccountStatus { get; set; } = string.Empty;
        public string? DepartmentName { get; set; }
        public string? ManagerName { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
    }
}
