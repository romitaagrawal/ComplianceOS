namespace ComplianceApi.Models
{
    public class AttendanceLog
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public User? User { get; set; }              // navigation property — EF links this automatically
        public DateTime ClockIn { get; set; }
        public DateTime? ClockOut { get; set; }       // nullable — not clocked out yet
        public double? TotalHours { get; set; }
        public bool IsOvertimeFlagged { get; set; } = false;
    }
}

