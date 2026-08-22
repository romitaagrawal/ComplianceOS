using ComplianceApi.Data;

namespace ComplianceApi.Services
{
    // Generates human-readable per-role codes (E001, M002, HR001, HRM001)
    // shown in the UI instead of raw numeric Ids. Every relationship in the
    // database still uses Id — DisplayId is a read-friendly label only.
    public class DisplayIdGenerator
    {
        private readonly AppDbContext _context;

        public DisplayIdGenerator(AppDbContext context)
        {
            _context = context;
        }

        private static string PrefixFor(string role) => role switch
        {
            "Employee" => "E",
            "Manager" => "M",
            "HREmployee" => "HR",
            "HRManager" => "HRM",
            _ => "U"
        };

        // Based on how many users currently hold that role. Safe because users
        // are soft-deactivated (AccountStatus = "Inactive") rather than hard
        // deleted, so the count never shrinks and a code is never reused.
        public string GenerateFor(string role)
        {
            string prefix = PrefixFor(role);
            int count = _context.Users.Count(u => u.Role == role) + 1;
            return $"{prefix}{count:D3}";
        }
    }
}