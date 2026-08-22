using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ComplianceApi.Data;
using ComplianceApi.DTOs;
using System.Security.Claims;

namespace ComplianceApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Manager,HRManager")]
    public class ManagerController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ManagerController(AppDbContext context)
        {
            _context = context;
        }

        private int GetUserId() =>
            int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        [HttpGet("my-team")]
        public IActionResult MyTeam()
        {
            int managerId = GetUserId();

            var team = _context.Users
                .Where(u => u.ManagerId == managerId)
                .Select(u => new
                {
                    u.Id,
                    u.DisplayId,
                    u.FullName,
                    u.Email,
                    u.Role,
                    u.LastLoginAt
                })
                .ToList();

            return Ok(team);
        }

        [HttpGet("team-attendance")]
        public IActionResult TeamAttendance([FromQuery] int? page, [FromQuery] int? pageSize)
        {
            int managerId = GetUserId();

            var query = _context.AttendanceLogs
                .Where(a => a.User!.ManagerId == managerId)
                .OrderByDescending(a => a.ClockIn);

            if (page == null || pageSize == null)
            {
                var all = query.Select(a => new
                {
                    a.Id,
                    EmployeeName = a.User!.FullName,
                    a.ClockIn,
                    a.ClockOut,
                    a.TotalHours,
                    a.IsOvertimeFlagged
                }).ToList();
                return Ok(all);
            }

            var totalCount = query.Count();
            var items = query
                .Skip((page.Value - 1) * pageSize.Value)
                .Take(pageSize.Value)
                .Select(a => new
                {
                    a.Id,
                    EmployeeName = a.User!.FullName,
                    a.ClockIn,
                    a.ClockOut,
                    a.TotalHours,
                    a.IsOvertimeFlagged
                })
                .ToList();

            return Ok(new { items, totalCount, page = page.Value, pageSize = pageSize.Value });
        }

        // "Direct Employees: 8 / Total Team Members: 15" from the requirements
        // doc. DirectReports is a simple count; TotalTeamMembers walks the
        // whole reporting subtree (covers Manager -> Sub-Manager -> Employee
        // chains of any depth) so a manager with sub-managers sees their
        // full org, not just the people who report straight to them.
        [HttpGet("team-stats")]
        public IActionResult TeamStats()
        {
            int managerId = GetUserId();

            int directReports = _context.Users.Count(u => u.ManagerId == managerId);
            int totalTeamMembers = CountDescendants(managerId);

            return Ok(new TeamStatsDto
            {
                DirectReports = directReports,
                TotalTeamMembers = totalTeamMembers
            });
        }

        private int CountDescendants(int managerId)
        {
            var directIds = _context.Users
                .Where(u => u.ManagerId == managerId)
                .Select(u => u.Id)
                .ToList();

            int total = directIds.Count;
            foreach (var id in directIds)
            {
                total += CountDescendants(id);
            }

            return total;
        }
    }
}