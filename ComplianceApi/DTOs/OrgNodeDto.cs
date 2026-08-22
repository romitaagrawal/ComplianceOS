namespace ComplianceApi.DTOs
{
    // One node of the dynamically-generated org tree. Built from the Users
    // table's ManagerId relationships in HrController.GetHierarchy — never
    // hardcoded, so it reflects real reporting lines and updates automatically
    // as ManagerId assignments change.
    public class OrgNodeDto
    {
        public int Id { get; set; }
        public string? DisplayId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? DepartmentName { get; set; }
        public List<OrgNodeDto> Children { get; set; } = new();
    }
}