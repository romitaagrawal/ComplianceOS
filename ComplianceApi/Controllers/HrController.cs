using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ComplianceApi.Data;
using ComplianceApi.DTOs;
using ComplianceApi.Models;
using ComplianceApi.Services;
using System.Security.Claims;

namespace ComplianceApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    // Both HR roles can view HR data. Only HRManager can make changes
    // (see the [Authorize(Roles = "HRManager")] override on the methods below).
    // This matches the frontend, which sends both HREmployee and HRManager
    // to the same /hr-dashboard screen.
    [Authorize(Roles = "HRManager,HREmployee")]
    public class HrController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly DisplayIdGenerator _displayIdGenerator;

        public HrController(AppDbContext context, DisplayIdGenerator displayIdGenerator)
        {
            _context = context;
            _displayIdGenerator = displayIdGenerator;
        }

        private int GetUserId() =>
            int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        [HttpGet("all-users")]
        public IActionResult AllUsers()
        {
            var users = _context.Users
                .Select(u => new
                {
                    u.Id,
                    u.DisplayId,
                    u.FullName,
                    u.Email,
                    u.Role,
                    u.AccountStatus,
                    u.ManagerId,
                    u.CreatedAt,
                    u.LastLoginAt
                })
                .ToList();

            return Ok(users);
        }

        [HttpGet("all-attendance")]
        public IActionResult AllAttendance()
        {
            var logs = _context.AttendanceLogs
                .OrderByDescending(a => a.ClockIn)
                .Select(a => new
                {
                    a.Id,
                    a.UserId,
                    EmployeeName = a.User!.FullName,
                    a.ClockIn,
                    a.ClockOut,
                    a.TotalHours,
                    a.IsOvertimeFlagged
                })
                .ToList();

            return Ok(logs);
        }

        [HttpGet("all-leave-requests")]
        public IActionResult AllLeaveRequests()
        {
            var requests = _context.LeaveRequests
                .OrderByDescending(l => l.StartDate)
                .Select(l => new
                {
                    l.Id,
                    l.UserId,
                    EmployeeName = l.User!.FullName,
                    l.StartDate,
                    l.EndDate,
                    l.Status,
                    l.LeaveType,
                    l.Reason,
                    HasAttachment = l.AttachmentStoredName != null,
                    l.AttachmentFileName
                })
                .ToList();

            return Ok(requests);
        }

        // Org-wide employee list with resolved names (department, manager)
        // instead of raw ids -- HRManager only. This is the "Employee List"
        // screen from the requirements doc: employee id / name / department /
        // manager, with the database still keyed by Id underneath.
        [HttpGet("employees")]
        [Authorize(Roles = "HRManager")]
        public IActionResult GetEmployeeList()
        {
            var employees = _context.Users
                .Select(u => new EmployeeListItemDto
                {
                    Id = u.Id,
                    DisplayId = u.DisplayId,
                    FullName = u.FullName,
                    Email = u.Email,
                    Role = u.Role,
                    AccountStatus = u.AccountStatus,
                    DepartmentName = u.Department != null ? u.Department.Name : null,
                    ManagerName = u.Manager != null ? u.Manager.FullName : null,
                    CreatedAt = u.CreatedAt,
                    LastLoginAt = u.LastLoginAt
                })
                .OrderBy(u => u.FullName)
                .ToList();

            return Ok(employees);
        }

        // Every manager-type user (Manager or HRManager), for populating the
        // "assign manager" dropdown when registering or reassigning someone.
        [HttpGet("managers")]
        [Authorize(Roles = "HRManager")]
        public IActionResult GetManagers()
        {
            var managers = _context.Users
                .Where(u => u.Role == "Manager" || u.Role == "HRManager")
                .Select(u => new
                {
                    u.Id,
                    u.DisplayId,
                    u.FullName,
                    DepartmentName = u.Department != null ? u.Department.Name : null
                })
                .OrderBy(u => u.FullName)
                .ToList();

            return Ok(managers);
        }

        // HR employees reporting directly to the calling HR Manager, with
        // their DisplayId so it can key straight into the task-assignment UI.
        [HttpGet("my-hr-team")]
        [Authorize(Roles = "HRManager")]
        public IActionResult MyHrTeam()
        {
            int hrManagerId = GetUserId();

            var team = _context.Users
                .Where(u => u.ManagerId == hrManagerId && u.Role == "HREmployee")
                .Select(u => new
                {
                    u.Id,
                    u.DisplayId,
                    u.FullName,
                    u.Email,
                    u.AccountStatus,
                    u.LastLoginAt
                })
                .OrderBy(u => u.FullName)
                .ToList();

            return Ok(team);
        }

        // Dynamic, database-driven org chart. Built in memory from every
        // user's ManagerId -- never hardcoded, so it always reflects the
        // real reporting structure and updates the moment a ManagerId
        // changes. Both HR roles can view (class-level Authorize applies).
        [HttpGet("hierarchy")]
        public IActionResult GetHierarchy()
        {
            var allUsers = _context.Users
                .Include(u => u.Department)
                .ToList();

            var childrenByManagerId = allUsers.ToLookup(u => u.ManagerId);

            OrgNodeDto BuildNode(User user)
            {
                return new OrgNodeDto
                {
                    Id = user.Id,
                    DisplayId = user.DisplayId,
                    FullName = user.FullName,
                    Role = user.Role,
                    DepartmentName = user.Department?.Name,
                    Children = childrenByManagerId[user.Id]
                        .OrderBy(u => u.FullName)
                        .Select(BuildNode)
                        .ToList()
                };
            }

            // Roots = users with no manager at all (top of the org, e.g. the
            // most senior HR Manager / department head).
            var roots = allUsers
                .Where(u => u.ManagerId == null)
                .OrderBy(u => u.FullName)
                .Select(BuildNode)
                .ToList();

            return Ok(roots);
        }

        // Register a brand-new employee (or manager/HR user) into the system.
        // HRManager-only -- regular HREmployee cannot reach this, matching
        // requirement #1 in the spec exactly.
        [HttpPost("register-employee")]
        [Authorize(Roles = "HRManager")]
        public IActionResult RegisterEmployee(RegisterEmployeeDto dto)
        {
            var validRoles = new[] { "Employee", "Manager", "HREmployee", "HRManager" };
            if (!validRoles.Contains(dto.Role))
                return BadRequest("Role must be one of: " + string.Join(", ", validRoles));

            if (string.IsNullOrWhiteSpace(dto.FullName) || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
                return BadRequest("Full name, email, and password are required.");

            if (_context.Users.Any(u => u.Email == dto.Email))
                return BadRequest("Email already registered.");

            if (dto.ManagerId.HasValue && !_context.Users.Any(u => u.Id == dto.ManagerId.Value))
                return BadRequest("Selected manager does not exist.");

            if (dto.DepartmentId.HasValue && !_context.Departments.Any(d => d.Id == dto.DepartmentId.Value))
                return BadRequest("Selected department does not exist.");

            var user = new User
            {
                FullName = dto.FullName,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = dto.Role,
                DisplayId = _displayIdGenerator.GenerateFor(dto.Role),
                ManagerId = dto.ManagerId,
                DepartmentId = dto.DepartmentId,
                AccountStatus = "Active",
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            _context.SaveChanges();

            return Ok(new { user.Id, user.DisplayId, user.FullName, user.Role });
        }

        // Only a full HR Manager can change someone's role or deactivate them --
        // this is the ONLY place a role can be assigned above "Employee" via
        // self-service, and it's now also the place a DisplayId gets
        // regenerated to match the new role.
        [HttpPut("users/{id}/role")]
        [Authorize(Roles = "HRManager")]
        public IActionResult ChangeRole(int id, RoleChangeDto dto)
        {
            var validRoles = new[] { "Employee", "Manager", "HREmployee", "HRManager" };
            if (!validRoles.Contains(dto.Role))
                return BadRequest("Role must be one of: " + string.Join(", ", validRoles));

            var user = _context.Users.FirstOrDefault(u => u.Id == id);
            if (user == null)
                return NotFound("User not found.");

            user.Role = dto.Role;
            user.DisplayId = _displayIdGenerator.GenerateFor(dto.Role);
            _context.SaveChanges();

            return Ok($"{user.FullName}'s role updated to {dto.Role} ({user.DisplayId}).");
        }

        // Deactivate/reactivate an account (soft-delete instead of removing rows,
        // so attendance/leave/task history is preserved).
        [HttpPut("users/{id}/status")]
        [Authorize(Roles = "HRManager")]
        public IActionResult SetStatus(int id, [FromBody] string status)
        {
            if (status != "Active" && status != "Inactive")
                return BadRequest("Status must be 'Active' or 'Inactive'.");

            var user = _context.Users.FirstOrDefault(u => u.Id == id);
            if (user == null)
                return NotFound("User not found.");

            user.AccountStatus = status;
            _context.SaveChanges();

            return Ok($"{user.FullName}'s account is now {status}.");
        }

        // HR: view password reset requests. Both HR roles can see them
        // (class-level [Authorize] applies) -- same read-for-both,
        // write-for-HRManager-only pattern as everything else here.
        [HttpGet("password-reset-requests")]
        public IActionResult PasswordResetRequests()
        {
            var requests = _context.PasswordResetRequests
                .OrderByDescending(p => p.RequestedAt)
                .Select(p => new PasswordResetResponseDto
                {
                    Id = p.Id,
                    UserId = p.UserId,
                    EmployeeName = p.User!.FullName,
                    EmployeeEmail = p.User.Email,
                    EmployeeDisplayId = p.User.DisplayId,
                    Status = p.Status,
                    RejectionReason = p.RejectionReason,
                    RequestedAt = p.RequestedAt,
                    ResolvedAt = p.ResolvedAt,
                    ResolvedByName = p.ResolvedByUser != null ? p.ResolvedByUser.FullName : null
                })
                .ToList();

            return Ok(requests);
        }

        // HR Manager resolves a request: resets the password to a fresh,
        // securely-hashed temporary one (returned once, in this response
        // only -- never stored or logged in plain text), or rejects it with
        // a reason. The request's own UserId (fixed at submission time) is
        // what stops HR from resetting an account that never actually
        // asked for it -- there's no way to target an arbitrary user here.
        [HttpPut("password-reset-requests/{id}/resolve")]
        [Authorize(Roles = "HRManager")]
        public IActionResult ResolvePasswordReset(int id, PasswordResetActionDto dto)
        {
            var request = _context.PasswordResetRequests
                .Include(p => p.User)
                .FirstOrDefault(p => p.Id == id);

            if (request == null)
                return NotFound("Password reset request not found.");

            if (request.Status != "Pending")
                return BadRequest($"This request has already been {request.Status.ToLower()}.");

            if (dto.Action != "Reset" && dto.Action != "Reject")
                return BadRequest("Action must be 'Reset' or 'Reject'.");

            int hrUserId = GetUserId();

            if (dto.Action == "Reject")
            {
                if (string.IsNullOrWhiteSpace(dto.RejectionReason))
                    return BadRequest("A rejection reason is required.");

                request.Status = "Rejected";
                request.RejectionReason = dto.RejectionReason;
                request.ResolvedAt = DateTime.UtcNow;
                request.ResolvedByUserId = hrUserId;
                _context.SaveChanges();

                return Ok(new { message = "Request rejected.", temporaryPassword = (string?)null });
            }

            var temporaryPassword = GenerateTemporaryPassword();
            request.User!.PasswordHash = BCrypt.Net.BCrypt.HashPassword(temporaryPassword);

            request.Status = "Reset";
            request.ResolvedAt = DateTime.UtcNow;
            request.ResolvedByUserId = hrUserId;
            _context.SaveChanges();

            return Ok(new
            {
                message = $"Password reset for {request.User.FullName}. Share this temporary password with them securely — it will not be shown again.",
                temporaryPassword = (string?)temporaryPassword
            });
        }

        // 10 characters, drawn from a set that excludes visually-confusable
        // characters (0/O, 1/l/I) since HR often has to read this aloud or
        // retype it. Uses a cryptographically secure RNG, not System.Random.
        private static string GenerateTemporaryPassword()
        {
            const string chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
            var bytes = new byte[10];
            System.Security.Cryptography.RandomNumberGenerator.Fill(bytes);
            var result = new char[10];
            for (int i = 0; i < 10; i++)
            {
                result[i] = chars[bytes[i] % chars.Length];
            }
            return new string(result);
        }
    }
}