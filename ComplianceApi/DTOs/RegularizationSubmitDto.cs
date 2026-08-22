namespace ComplianceApi.DTOs
{
    public class RegularizationSubmitDto
    {
        public DateTime AttendanceDate { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? OtherReasonText { get; set; }
        public DateTime RequestedClockIn { get; set; }
        public DateTime RequestedClockOut { get; set; }
        public string? Remarks { get; set; }
    }
}