using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ComplianceApi.DTOs;
using ComplianceApi.Services;
using System.Security.Claims;

namespace ComplianceApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AttendanceRegularizationController : ControllerBase
    {
        private readonly IAttendanceRegularizationService _service;

        public AttendanceRegularizationController(IAttendanceRegularizationService service)
        {
            _service = service;
        }

        private int GetUserId() =>
            int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // Any authenticated user who has attendance can request a correction.
        [HttpPost]
        public IActionResult Submit(RegularizationSubmitDto dto)
        {
            var (success, message, newId) = _service.SubmitRequest(GetUserId(), dto);
            if (!success) return BadRequest(message);
            return Ok(new { message, id = newId });
        }

        [HttpGet("my-history")]
        public IActionResult MyHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var (items, totalCount) = _service.GetMyHistory(GetUserId(), page, pageSize);
            return Ok(new { items, totalCount, page, pageSize });
        }

        // Hierarchy-based, NOT role-based: this returns whatever is routed
        // to the caller via ManagerId, no [Authorize(Roles=...)] restriction.
        // A caller with no direct reports just gets an empty list back.
        [HttpGet("pending-approvals")]
        public IActionResult PendingApprovals() => Ok(_service.GetPendingApprovals(GetUserId()));

        [HttpPut("{id}/approve")]
        public IActionResult Approve(int id)
        {
            var (success, message) = _service.Approve(id, GetUserId());
            if (!success) return BadRequest(message);
            return Ok(message);
        }

        [HttpPut("{id}/reject")]
        public IActionResult Reject(int id, RegularizationRejectDto dto)
        {
            var (success, message) = _service.Reject(id, GetUserId(), dto.RejectionReason);
            if (!success) return BadRequest(message);
            return Ok(message);
        }

        [HttpPut("{id}/cancel")]
        public IActionResult Cancel(int id)
        {
            var (success, message) = _service.Cancel(id, GetUserId());
            if (!success) return BadRequest(message);
            return Ok(message);
        }
    }
}