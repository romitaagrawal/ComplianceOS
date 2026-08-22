using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ComplianceApi.Data;
using ComplianceApi.Models;
using ComplianceApi.DTOs;

namespace ComplianceApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DepartmentController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DepartmentController(AppDbContext context)
        {
            _context = context;
        }

        // Anyone logged in can view departments (needed for dropdowns during registration, profile display, etc.)
        [HttpGet]
        [Authorize]
        public IActionResult GetAll()
        {
            var departments = _context.Departments
                .Select(d => new { d.Id, d.Name, d.Description })
                .ToList();

            return Ok(departments);
        }

        // Only HR Managers can create new departments.
        // Binds to a DTO — NOT the Department entity — so a caller can never
        // set the Id themselves or attach/detach Users through this endpoint
        // (overposting / mass-assignment).
        [HttpPost]
        [Authorize(Roles = "HRManager")]
        public IActionResult Create([FromBody] DepartmentCreateDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest("Department name is required.");

            if (_context.Departments.Any(d => d.Name == dto.Name))
                return BadRequest("A department with this name already exists.");

            var dept = new Department
            {
                Name = dto.Name,
                Description = dto.Description
            };

            _context.Departments.Add(dept);
            _context.SaveChanges();

            return Ok(new { dept.Id, dept.Name, dept.Description });
        }
    }
}