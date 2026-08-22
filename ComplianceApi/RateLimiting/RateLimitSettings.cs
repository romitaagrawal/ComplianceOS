namespace ComplianceApi.RateLimiting
{
    // Bound from the "RateLimiting" section of appsettings.json. Every limit
    // lives here instead of being hardcoded in Program.cs or a controller,
    // so ops/config can retune limits per-environment without a code change.
    public class RateLimitSettings
    {
        public RateLimitPolicySettings Global { get; set; } = new();
        public RateLimitPolicySettings Auth { get; set; } = new();
        public RateLimitPolicySettings Upload { get; set; } = new();
    }

    public class RateLimitPolicySettings
    {
        public int PermitLimit { get; set; }
        public int WindowSeconds { get; set; }
        public int QueueLimit { get; set; } = 0;
    }
}