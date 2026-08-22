namespace ComplianceApi.Models
{
    public class LeaveRequest
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public User? User { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected
        public string LeaveType { get; set; } = "Other"; // Medical Leave, Casual Leave, Annual Leave, Unpaid Leave, Other
        public string? Reason { get; set; }

        // Attachment (optional unless LeaveType == "Medical Leave"). The file
        // itself lives on disk, not in the database -- these columns are just
        // the pointer + metadata needed to authorize and serve it later.
        public string? AttachmentFileName { get; set; }     // original name shown to users
        public string? AttachmentStoredName { get; set; }   // actual filename on disk (GUID-based, never user input)
        public string? AttachmentContentType { get; set; }
        public long? AttachmentSizeBytes { get; set; }
        public DateTime? AttachmentUploadedAt { get; set; }
    }
}