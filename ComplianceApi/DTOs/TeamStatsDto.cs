namespace ComplianceApi.DTOs
{
    public class TeamStatsDto
    {
        public int DirectReports { get; set; }
        public int TotalTeamMembers { get; set; } // recursive, whole subtree
    }
}