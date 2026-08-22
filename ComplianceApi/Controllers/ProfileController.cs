using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ComplianceApi.Data;
using System.Security.Claims;

namespace ComplianceApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ProfileController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ProfileController(AppDbContext context)
        {
            _context = context;
        }

        private int GetUserId() =>
            int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // Full profile card: name, email, role, department, account info
        [HttpGet("me")]
        public IActionResult Me()
        {
            int userId = GetUserId();

            var user = _context.Users
                .Where(u => u.Id == userId)
                .Select(u => new
                {
                    u.Id,
                    u.FullName,
                    u.Email,
                    u.Role,
                    u.AccountStatus,
                    u.CreatedAt,
                    DepartmentName = u.Department != null ? u.Department.Name : null
                })
                .FirstOrDefault();

            if (user == null) return NotFound();
            return Ok(user);
        }

        // "My Manager" card
        [HttpGet("my-manager")]
        public IActionResult MyManager()
        {
            int userId = GetUserId();

            var user = _context.Users.FirstOrDefault(u => u.Id == userId);
            if (user == null || user.ManagerId == null)
                return Ok(null); // no manager (e.g. top-level HR Manager)

            var manager = _context.Users
                .Where(u => u.Id == user.ManagerId)
                .Select(u => new
                {
                    u.Id,
                    u.FullName,
                    u.Email,
                    u.Role,
                    DepartmentName = u.Department != null ? u.Department.Name : null
                })
                .FirstOrDefault();

            return Ok(manager);
        }
    }
}