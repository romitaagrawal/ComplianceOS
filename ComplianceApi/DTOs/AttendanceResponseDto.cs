namespace ComplianceApi.DTOs
{
    public class AttendanceResponseDto
    {
        public int Id { get; set; }
        public DateTime ClockIn { get; set; }
        public DateTime? ClockOut { get; set; }
        public double? TotalHours { get; set; }
        public bool IsOvertimeFlagged { get; set; }
    }
}