namespace ComplianceApi.Models
{
    // Named TaskItem (not "Task") to avoid clashing with System.Threading.Tasks.Task.
    public class TaskItem
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }

        public string Priority { get; set; } = "Medium"; // Low, Medium, High
        public string Status { get; set; } = "Pending";  // Pending, InProgress, Completed

        public DateTime? Deadline { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public int AssignedToUserId { get; set; }
        public User? AssignedTo { get; set; }

        public int AssignedByUserId { get; set; }
        public User? AssignedBy { get; set; }
    }
}