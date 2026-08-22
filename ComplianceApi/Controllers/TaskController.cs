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
    public class TaskController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TaskController(AppDbContext context)
        {
            _context = context;
        }

        private int GetUserId() =>
            int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // Assign a task to one of YOUR direct reports, OR to yourself (a
        // personal task). Managers and HR Managers have their own work in
        // addition to supervising a team, so self-assignment is allowed
        // alongside the existing reporting-hierarchy check.
        [HttpPost]
        [Authorize(Roles = "Manager,HRManager")]
        public IActionResult AssignTask(TaskCreateDto dto)
        {
            int assignerId = GetUserId();

            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest("Title is required.");

            var validPriorities = new[] { "Low", "Medium", "High" };
            if (!validPriorities.Contains(dto.Priority))
                return BadRequest("Priority must be one of: " + string.Join(", ", validPriorities));

            var assignee = _context.Users.FirstOrDefault(u => u.Id == dto.AssignedToUserId);
            if (assignee == null)
                return NotFound("Assignee not found.");

            bool isOwnDirectReport = assignee.ManagerId == assignerId;
            bool isSelf = assignee.Id == assignerId;

            if (!isOwnDirectReport && !isSelf)
                return Forbid();

            var task = new TaskItem
            {
                Title = dto.Title,
                Description = dto.Description,
                Priority = dto.Priority,
                Deadline = dto.Deadline,
                Status = "Pending",
                AssignedToUserId = dto.AssignedToUserId,
                AssignedByUserId = assignerId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Tasks.Add(task);
            _context.SaveChanges();

            return Ok(MapOwnTask(task));
        }

        // Tasks assigned TO me, regardless of my own role -- an Employee,
        // an HREmployee, or a Manager who also has their own manager can
        // all have tasks waiting on them. Now also returns AssignedByUserId
        // so the frontend can tell "my manager assigned this to me" apart
        // from "I created this for myself".
        [HttpGet("my-tasks")]
        public IActionResult MyTasks()
        {
            int userId = GetUserId();

            var tasks = _context.Tasks
                .Where(t => t.AssignedToUserId == userId)
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new
                {
                    t.Id,
                    t.Title,
                    t.Description,
                    t.Priority,
                    t.Status,
                    t.Deadline,
                    t.CreatedAt,
                    t.AssignedByUserId,
                    AssignedByName = t.AssignedBy!.FullName
                })
                .ToList();

            return Ok(tasks);
        }

        // Tasks I've handed out to my direct reports, with live status --
        // this is the "team tasks" / "HR team task progress" view.
        [HttpGet("team-tasks")]
        [Authorize(Roles = "Manager,HRManager")]
        public IActionResult TeamTasks()
        {
            int assignerId = GetUserId();

            var tasks = _context.Tasks
                .Where(t => t.AssignedByUserId == assignerId && t.AssignedToUserId != assignerId)
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new
                {
                    t.Id,
                    t.Title,
                    t.Description,
                    t.Priority,
                    t.Status,
                    t.Deadline,
                    t.CreatedAt,
                    t.AssignedToUserId,
                    AssignedToName = t.AssignedTo!.FullName
                })
                .ToList();

            return Ok(tasks);
        }

        // The assignee updates the status of their own task (Pending ->
        // InProgress -> Completed). Only the person the task belongs to
        // can change it -- not the assigner, not anyone else.
        [HttpPut("{id}/status")]
        public IActionResult UpdateStatus(int id, TaskStatusUpdateDto dto)
        {
            int userId = GetUserId();

            var task = _context.Tasks.FirstOrDefault(t => t.Id == id);
            if (task == null)
                return NotFound("Task not found.");

            if (task.AssignedToUserId != userId)
                return Forbid();

            var validStatuses = new[] { "Pending", "InProgress", "Completed" };
            if (!validStatuses.Contains(dto.Status))
                return BadRequest("Status must be one of: " + string.Join(", ", validStatuses));

            task.Status = dto.Status;
            _context.SaveChanges();

            return Ok(MapOwnTask(task));
        }

        // Edit a task's details. Restricted to tasks you created for
        // YOURSELF (AssignedByUserId and AssignedToUserId both equal the
        // caller) -- editing something you delegated to someone else, or
        // something your own manager assigned to you, is out of scope here.
        [HttpPut("{id}")]
        [Authorize(Roles = "Manager,HRManager")]
        public IActionResult UpdateTask(int id, TaskCreateDto dto)
        {
            int userId = GetUserId();

            var task = _context.Tasks.FirstOrDefault(t => t.Id == id);
            if (task == null)
                return NotFound("Task not found.");

            if (task.AssignedByUserId != userId || task.AssignedToUserId != userId)
                return Forbid();

            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest("Title is required.");

            var validPriorities = new[] { "Low", "Medium", "High" };
            if (!validPriorities.Contains(dto.Priority))
                return BadRequest("Priority must be one of: " + string.Join(", ", validPriorities));

            task.Title = dto.Title;
            task.Description = dto.Description;
            task.Priority = dto.Priority;
            task.Deadline = dto.Deadline;
            _context.SaveChanges();

            return Ok(MapOwnTask(task));
        }

        // Delete a personal task. Same restriction as UpdateTask -- only a
        // task you created for yourself can be removed this way.
        [HttpDelete("{id}")]
        [Authorize(Roles = "Manager,HRManager")]
        public IActionResult DeleteTask(int id)
        {
            int userId = GetUserId();

            var task = _context.Tasks.FirstOrDefault(t => t.Id == id);
            if (task == null)
                return NotFound("Task not found.");

            if (task.AssignedByUserId != userId || task.AssignedToUserId != userId)
                return Forbid();

            _context.Tasks.Remove(task);
            _context.SaveChanges();

            return Ok("Task deleted.");
        }

        private static object MapOwnTask(TaskItem t) => new
        {
            t.Id,
            t.Title,
            t.Description,
            t.Priority,
            t.Status,
            t.Deadline,
            t.CreatedAt,
            t.AssignedToUserId
        };
    }
}