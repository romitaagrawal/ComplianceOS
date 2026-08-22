namespace ComplianceApi.DTOs
{
    // Used by HrController.RegisterEmployee — HRManager-only. Unlike
    // AuthController.RegisterDto (public self sign-up, always forced to
    // "Employee"), this DTO lets the caller specify any role, because only
    // an HRManager can reach the endpoint that binds it.
    public class RegisterEmployeeDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = "Employee"; // Employee, Manager, HREmployee, HRManager
        public int? ManagerId { get; set; }
        public int? DepartmentId { get; set; }
    }
}