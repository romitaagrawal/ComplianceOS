namespace ComplianceApi.DTOs
{
    public class RegisterDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;

        // Role is intentionally NOT here anymore.
        // Letting a client pick their own Role at sign-up is how someone
        // registers themselves as "HRManager" and gets full admin access.
        // Every new self-registered account is always "Employee" — role
        // changes (promotions to Manager/HR) happen through a separate,
        // HR-only endpoint after the account already exists.

        public int? ManagerId { get; set; }
        public int? DepartmentId { get; set; }
    }
}