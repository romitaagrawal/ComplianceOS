using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ComplianceApi.Data;
using ComplianceApi.Models;
using ComplianceApi.DTOs;
using System.Security.Claims;

namespace ComplianceApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AttendanceController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AttendanceController(AppDbContext context)
        {
            _context = context;
        }

        private int GetUserId()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)!.Value;
            return int.Parse(idClaim);
        }

        // Finds today's log for this user, if one exists (regardless of clock-out status)
        private AttendanceLog? GetTodaysLog(int userId)
        {
            var today = DateTime.Today;
            return _context.AttendanceLogs
                .FirstOrDefault(a => a.UserId == userId && a.ClockIn.Date == today);
        }

        [HttpPost("clock-in")]
        public IActionResult ClockIn()
        {
            int userId = GetUserId();

            var existing = GetTodaysLog(userId);
            if (existing != null)
                return BadRequest("You have already clocked in today.");

            var log = new AttendanceLog
            {
                UserId = userId,
                ClockIn = DateTime.Now
            };

            _context.AttendanceLogs.Add(log);
            _context.SaveChanges();

            return Ok(MapToDto(log));
        }

        [HttpPost("clock-out")]
        public IActionResult ClockOut()
        {
            int userId = GetUserId();

            var todaysLog = GetTodaysLog(userId);
            if (todaysLog == null)
                return BadRequest("You have not clocked in today.");

            if (todaysLog.ClockOut != null)
                return BadRequest("You have already clocked out today.");

            todaysLog.ClockOut = DateTime.Now;
            todaysLog.TotalHours = (todaysLog.ClockOut.Value - todaysLog.ClockIn).TotalHours;

            if (todaysLog.TotalHours > 8)
                todaysLog.IsOvertimeFlagged = true;

            _context.SaveChanges();

            return Ok(MapToDto(todaysLog));
        }

        // New: tells the frontend today's status immediately, no guessing from the full history list
        [HttpGet("today")]
        public IActionResult GetToday()
        {
            int userId = GetUserId();
            var todaysLog = GetTodaysLog(userId);

            if (todaysLog == null)
                return Ok(null);

            return Ok(MapToDto(todaysLog));
        }

        [HttpGet("my-logs")]
        public IActionResult GetMyLogs([FromQuery] int? page, [FromQuery] int? pageSize)
        {
            int userId = GetUserId();

            var query = _context.AttendanceLogs
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.ClockIn);

            // No paging params -> full list, unchanged. The Weekly Hours chart
            // relies on this exact behavior to slice any week client-side.
            if (page == null || pageSize == null)
            {
                return Ok(query.Select(a => MapToDto(a)).ToList());
            }

            var totalCount = query.Count();
            var items = query
                .Skip((page.Value - 1) * pageSize.Value)
                .Take(pageSize.Value)
                .Select(a => MapToDto(a))
                .ToList();

            return Ok(new PagedResultDto<AttendanceResponseDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page.Value,
                PageSize = pageSize.Value
            });
        }

        private static AttendanceResponseDto MapToDto(AttendanceLog a) => new AttendanceResponseDto
        {
            Id = a.Id,
            ClockIn = a.ClockIn,
            ClockOut = a.ClockOut,
            TotalHours = a.TotalHours,
            IsOvertimeFlagged = a.IsOvertimeFlagged
        };
    }
}