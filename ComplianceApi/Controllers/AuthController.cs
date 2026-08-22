using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ComplianceApi.Data;
using ComplianceApi.DTOs;
using ComplianceApi.Models;
using ComplianceApi.Services;
using System.Security.Claims;

namespace ComplianceApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly TokenService _tokenService;
        private readonly DisplayIdGenerator _displayIdGenerator;

        // No password rule existed anywhere in this app before now -- this
        // is a new, minimal baseline applied only to the new Change
        // Password flow, not retrofitted onto Register/RegisterEmployee.
        private const int MinPasswordLength = 6;

        public AuthController(AppDbContext context, TokenService tokenService, DisplayIdGenerator displayIdGenerator)
        {
            _context = context;
            _tokenService = tokenService;
            _displayIdGenerator = displayIdGenerator;
        }

        private int GetUserId() =>
            int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        [HttpPost("register")]
        public IActionResult Register(RegisterDto dto)
        {
            if (_context.Users.Any(u => u.Email == dto.Email))
                return BadRequest("Email already registered.");

            var user = new User
            {
                FullName = dto.FullName,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = "Employee",
                DisplayId = _displayIdGenerator.GenerateFor("Employee"),
                ManagerId = dto.ManagerId,
                DepartmentId = dto.DepartmentId,
                AccountStatus = "Active",
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            _context.SaveChanges();

            return Ok("User registered successfully.");
        }

        [HttpPost("login")]
        public IActionResult Login(LoginDto dto)
        {
            var user = _context.Users.SingleOrDefault(u => u.Email == dto.Email);
            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                return Unauthorized("Invalid email or password.");

            if (user.AccountStatus != "Active")
                return Unauthorized("This account has been deactivated. Please contact HR.");

            user.LastLoginAt = DateTime.UtcNow;
            _context.SaveChanges();

            var token = _tokenService.CreateToken(user);
            return Ok(new { token });
        }

        // Authenticated user changes their own password. The JWT carries no
        // password/security-stamp claim, so the existing token is still
        // valid afterward -- the user is NOT logged out.
        [HttpPost("change-password")]
        [Authorize]
        public IActionResult ChangePassword(ChangePasswordDto dto)
        {
            var user = _context.Users.FirstOrDefault(u => u.Id == GetUserId());
            if (user == null)
                return NotFound("User not found.");

            if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
                return BadRequest("Current password is incorrect.");

            if (dto.NewPassword != dto.ConfirmNewPassword)
                return BadRequest("New password and confirmation do not match.");

            if (dto.NewPassword.Length < MinPasswordLength)
                return BadRequest($"New password must be at least {MinPasswordLength} characters long.");

            if (dto.NewPassword == dto.CurrentPassword)
                return BadRequest("New password must be different from your current password.");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            _context.SaveChanges();

            return Ok("Password changed successfully.");
        }

        // Anonymous -- this is exactly the case where the user CAN'T log in,
        // so there's no token to require here. Always returns the same
        // generic message whether or not the email matched a real account,
        // so this endpoint can't be used to discover which emails exist.
        [HttpPost("forgot-password")]
        public IActionResult ForgotPassword(ForgotPasswordDto dto)
        {
            const string genericMessage = "If an account exists with this email, your request has been submitted to HR.";

            var user = _context.Users.SingleOrDefault(u => u.Email == dto.Email);
            if (user == null || user.AccountStatus != "Active")
                return Ok(genericMessage);

            bool alreadyPending = _context.PasswordResetRequests
                .Any(p => p.UserId == user.Id && p.Status == "Pending");

            if (!alreadyPending)
            {
                _context.PasswordResetRequests.Add(new PasswordResetRequest
                {
                    UserId = user.Id,
                    Status = "Pending",
                    RequestedAt = DateTime.UtcNow
                });
                _context.SaveChanges();
            }

            return Ok(genericMessage);
        }

        // Anonymous status check by email -- same reasoning as above, the
        // user still has no token. Note: unlike the submit endpoint above,
        // this one DOES reveal whether the email is registered (a NotFound
        // vs a found status necessarily differ) -- an intentional tradeoff,
        // since "show the request status" only works if it can distinguish
        // "no request" from "found." Acceptable for an internal HR tool;
        // flagging it so it's a conscious choice, not an oversight.
        [HttpGet("forgot-password/status")]
        public IActionResult ForgotPasswordStatus([FromQuery] string email)
        {
            var user = _context.Users.SingleOrDefault(u => u.Email == email);
            if (user == null)
                return NotFound("No request found for this email.");

            var latest = _context.PasswordResetRequests
                .Where(p => p.UserId == user.Id)
                .OrderByDescending(p => p.RequestedAt)
                .Select(p => new PasswordResetResponseDto
                {
                    Id = p.Id,
                    UserId = p.UserId,
                    Status = p.Status,
                    RejectionReason = p.RejectionReason,
                    RequestedAt = p.RequestedAt,
                    ResolvedAt = p.ResolvedAt,
                    ResolvedByName = p.ResolvedByUser != null ? p.ResolvedByUser.FullName : null
                })
                .FirstOrDefault();

            if (latest == null)
                return NotFound("No request found for this email.");

            return Ok(latest);
        }
    }
}