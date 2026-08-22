using System.Security.Claims;
using System.Text.Json;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace ComplianceApi.RateLimiting
{
    // All rate limiting setup lives here, kept out of Program.cs so that file
    // stays focused on startup wiring. Nothing here touches business logic --
    // it only decides whether a request is let through to it.
    public static class RateLimitingExtensions
    {
        public static IServiceCollection AddAppRateLimiting(this IServiceCollection services, IConfiguration configuration)
        {
            var settings = configuration.GetSection("RateLimiting").Get<RateLimitSettings>() ?? new RateLimitSettings();

            services.AddRateLimiter(options =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

                // ---- Global limiter: evaluated for EVERY request, first. ----
                // Protects normal dashboard/attendance/task/leave/regularization
                // traffic from accidental loops, misbehaving polling, or bots --
                // without getting in the way of a real user's normal workload
                // (a dashboard page load alone can fire 5-10 parallel GETs).
                options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
                {
                    var partitionKey = ResolvePartitionKey(httpContext);
                    return RateLimitPartition.GetSlidingWindowLimiter(partitionKey, _ => new SlidingWindowRateLimiterOptions
                    {
                        PermitLimit = settings.Global.PermitLimit,
                        Window = TimeSpan.FromSeconds(settings.Global.WindowSeconds),
                        SegmentsPerWindow = 4,
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = settings.Global.QueueLimit
                    });
                });

                // ---- "auth" policy: stacked ON TOP of the global limiter for ----
                // Login/Register. Always partitioned by IP -- there is no
                // authenticated identity yet at this point in the pipeline.
                options.AddPolicy("auth", httpContext =>
                {
                    var ip = ResolveIp(httpContext);
                    return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = settings.Auth.PermitLimit,
                        Window = TimeSpan.FromSeconds(settings.Auth.WindowSeconds),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = settings.Auth.QueueLimit
                    });
                });

                // ---- "upload" policy: stacked ON TOP of the global limiter for ----
                // the Leave attachment endpoint. Partitioned by user (the
                // endpoint is [Authorize]-only, so a caller always has an id).
                options.AddPolicy("upload", httpContext =>
                {
                    var partitionKey = ResolvePartitionKey(httpContext);
                    return RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = settings.Upload.PermitLimit,
                        Window = TimeSpan.FromSeconds(settings.Upload.WindowSeconds),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = settings.Upload.QueueLimit
                    });
                });

                // Every rejection (global OR a named policy) ends up here.
                // Always a 429, always a Retry-After header, always a JSON body
                // the Angular interceptor can read a clear message out of.
                options.OnRejected = async (context, token) =>
                {
                    context.HttpContext.Response.ContentType = "application/json";

                    int retryAfterSeconds = 60;
                    if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                    {
                        retryAfterSeconds = (int)Math.Ceiling(retryAfter.TotalSeconds);
                    }
                    context.HttpContext.Response.Headers.RetryAfter = retryAfterSeconds.ToString();

                    var body = JsonSerializer.Serialize(new
                    {
                        error = "TooManyRequests",
                        message = "Too many requests. Please try again later.",
                        retryAfterSeconds
                    });

                    await context.HttpContext.Response.WriteAsync(body, token);
                };
            });

            return services;
        }

        // Authenticated calls are partitioned per user, not per IP -- several
        // employees can sit behind the same office/VPN IP, and one busy user
        // should never eat a coworker's quota (or vice versa). Falls back to
        // IP only when there is no signed-in user yet (anonymous endpoints).
        private static string ResolvePartitionKey(HttpContext httpContext)
        {
            var userId = httpContext.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return !string.IsNullOrEmpty(userId) ? $"user:{userId}" : $"ip:{ResolveIp(httpContext)}";
        }

        private static string ResolveIp(HttpContext httpContext)
        {
            return httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        }
    }
}