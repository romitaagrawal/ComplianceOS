using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ComplianceApi.Data;
using ComplianceApi.Models;
using ComplianceApi.DTOs;
using System.Security.Claims;

namespace ComplianceApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class LeaveController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;

        private static readonly string[] ValidLeaveTypes =
        {
            "Medical Leave", "Casual Leave", "Annual Leave", "Unpaid Leave", "Other"
        };

        // Extension -> canonical content type, also doubles as the allow-list.
        private static readonly Dictionary<string, string> AllowedAttachmentTypes = new()
        {
            { ".pdf", "application/pdf" },
            { ".jpg", "image/jpeg" },
            { ".jpeg", "image/jpeg" },
            { ".png", "image/png" }
        };

        private const long MaxAttachmentSizeBytes = 5 * 1024 * 1024; // 5 MB

        public LeaveController(AppDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        private int GetUserId() =>
            int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        private string GetUserRole() =>
            User.FindFirst(ClaimTypes.Role)!.Value;

        // Employee: submit a leave request. Now multipart/form-data instead of
        // JSON, since it can carry a file. [FromForm] binds each simple field
        // plus the IFormFile from the same multipart body.
        // Stricter than the global limit -- this is the one endpoint in the
        // app that accepts a file, so it's the one worth capping separately
        // (repeated large uploads are far more expensive than a normal GET).
        [HttpPost("apply")]
        [EnableRateLimiting("upload")]
        public async Task<IActionResult> Apply([FromForm] LeaveRequestDto dto)
        {
            if (dto.EndDate.Date < dto.StartDate.Date)
                return BadRequest("End date cannot be before the start date.");

            if (dto.StartDate.Date < DateTime.UtcNow.Date)
                return BadRequest("Cannot apply for leave that starts in the past.");

            if (!ValidLeaveTypes.Contains(dto.LeaveType))
                return BadRequest("Please choose a valid leave type.");

            if (dto.LeaveType == "Medical Leave" && dto.Attachment == null)
                return BadRequest("A supporting document (prescription/medical certificate) is required for Medical Leave.");

            string? extension = null;
            if (dto.Attachment != null)
            {
                extension = Path.GetExtension(dto.Attachment.FileName).ToLowerInvariant();
                if (!AllowedAttachmentTypes.ContainsKey(extension))
                    return BadRequest("Only PDF, JPG, JPEG, and PNG files are allowed.");

                if (dto.Attachment.Length == 0)
                    return BadRequest("The attached file is empty.");

                if (dto.Attachment.Length > MaxAttachmentSizeBytes)
                    return BadRequest("Attachment must be smaller than 5 MB.");
            }

            int userId = GetUserId();

            bool overlaps = _context.LeaveRequests.Any(l =>
                l.UserId == userId &&
                l.Status != "Rejected" &&
                dto.StartDate.Date <= l.EndDate.Date &&
                dto.EndDate.Date >= l.StartDate.Date);

            if (overlaps)
                return BadRequest("You already have a leave request that overlaps these dates.");

            // Every validation has passed -- only now is it safe to write the
            // file to disk (avoids orphaned files if a later check had failed).
            string? storedName = null;
            if (dto.Attachment != null)
            {
                storedName = $"{Guid.NewGuid()}{extension}";
                var folder = Path.Combine(_env.ContentRootPath, "LeaveAttachments");
                Directory.CreateDirectory(folder);
                var fullPath = Path.Combine(folder, storedName);

                using var stream = new FileStream(fullPath, FileMode.Create);
                await dto.Attachment.CopyToAsync(stream);
            }

            var leave = new LeaveRequest
            {
                UserId = userId,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                LeaveType = dto.LeaveType,
                Reason = dto.Reason,
                Status = "Pending",
                AttachmentFileName = dto.Attachment?.FileName,
                AttachmentStoredName = storedName,
                AttachmentContentType = storedName != null ? AllowedAttachmentTypes[extension!] : null,
                AttachmentSizeBytes = dto.Attachment?.Length,
                AttachmentUploadedAt = storedName != null ? DateTime.UtcNow : null
            };

            _context.LeaveRequests.Add(leave);
            _context.SaveChanges();

            return Ok("Leave request submitted.");
        }

        // Employee: view their own leave requests
        [HttpGet("my-requests")]
        public IActionResult MyRequests()
        {
            int userId = GetUserId();

            var requests = _context.LeaveRequests
                .Where(l => l.UserId == userId)
                .OrderByDescending(l => l.StartDate)
                .Select(l => new LeaveResponseDto
                {
                    Id = l.Id,
                    UserId = l.UserId,
                    StartDate = l.StartDate,
                    EndDate = l.EndDate,
                    Status = l.Status,
                    LeaveType = l.LeaveType,
                    Reason = l.Reason,
                    HasAttachment = l.AttachmentStoredName != null,
                    AttachmentFileName = l.AttachmentFileName
                })
                .ToList();

            return Ok(requests);
        }

        // Manager: view leave requests submitted by their direct reports
        [HttpGet("team-requests")]
        [Authorize(Roles = "Manager,HRManager")]
        public IActionResult TeamRequests()
        {
            int managerId = GetUserId();

            var requests = _context.LeaveRequests
                .Where(l => l.User!.ManagerId == managerId)
                .OrderByDescending(l => l.StartDate)
                .Select(l => new LeaveResponseDto
                {
                    Id = l.Id,
                    UserId = l.UserId,
                    EmployeeName = l.User!.FullName,
                    StartDate = l.StartDate,
                    EndDate = l.EndDate,
                    Status = l.Status,
                    LeaveType = l.LeaveType,
                    Reason = l.Reason,
                    HasAttachment = l.AttachmentStoredName != null,
                    AttachmentFileName = l.AttachmentFileName
                })
                .ToList();

            return Ok(requests);
        }

        // Manager: approve or reject a specific leave request
        [HttpPut("{id}/action")]
        [Authorize(Roles = "Manager,HRManager")]
        public IActionResult ActOnRequest(int id, LeaveActionDto dto)
        {
            int managerId = GetUserId();

            var leave = _context.LeaveRequests.FirstOrDefault(l => l.Id == id);
            if (leave == null)
                return NotFound("Leave request not found.");

            var employee = _context.Users.FirstOrDefault(u => u.Id == leave.UserId);
            if (employee == null || employee.ManagerId != managerId)
                return Forbid();

            if (dto.Action != "Approve" && dto.Action != "Reject")
                return BadRequest("Action must be 'Approve' or 'Reject'.");

            if (leave.Status != "Pending")
                return BadRequest($"This request has already been {leave.Status.ToLower()} and cannot be changed.");

            leave.Status = dto.Action == "Approve" ? "Approved" : "Rejected";
            _context.SaveChanges();

            return Ok($"Leave request {leave.Status.ToLower()}.");
        }

        // Download/view the attachment. Authorized to: the requester, their
        // reporting manager (hierarchy-based, same ManagerId check as
        // ActOnRequest), or any HR role (matches HrController's existing
        // org-wide access). Nobody else -- including other managers -- can
        // reach this, and there is no static/public route to the file at all.
        [HttpGet("{id}/attachment")]
        public IActionResult DownloadAttachment(int id)
        {
            var leave = _context.LeaveRequests.FirstOrDefault(l => l.Id == id);
            if (leave == null)
                return NotFound("Leave request not found.");

            if (string.IsNullOrEmpty(leave.AttachmentStoredName))
                return NotFound("This leave request has no attachment.");

            int callerId = GetUserId();
            string callerRole = GetUserRole();

            bool isOwner = leave.UserId == callerId;
            bool isHr = callerRole == "HREmployee" || callerRole == "HRManager";
            bool isManager = false;

            if (!isOwner && !isHr)
            {
                var employee = _context.Users.FirstOrDefault(u => u.Id == leave.UserId);
                isManager = employee != null && employee.ManagerId == callerId;
            }

            if (!isOwner && !isHr && !isManager)
                return Forbid();

            var folder = Path.Combine(_env.ContentRootPath, "LeaveAttachments");
            var fullPath = Path.Combine(folder, leave.AttachmentStoredName);

            if (!System.IO.File.Exists(fullPath))
                return NotFound("Attachment file is missing on the server.");

            var bytes = System.IO.File.ReadAllBytes(fullPath);
            var contentType = leave.AttachmentContentType ?? "application/octet-stream";
            var downloadName = leave.AttachmentFileName ?? "attachment";

            return File(bytes, contentType, downloadName);
        }
    }
}