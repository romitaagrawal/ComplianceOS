namespace ComplianceApi.DTOs
{
    public class RoleChangeDto
    {
        // Must be one of: Employee, Manager, HREmployee, HRManager
        public string Role { get; set; } = string.Empty;
    }
}