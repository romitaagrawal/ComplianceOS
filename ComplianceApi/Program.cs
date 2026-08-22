using ComplianceApi.Data;
using Microsoft.EntityFrameworkCore;
using ComplianceApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using ComplianceApi.RateLimiting;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<DisplayIdGenerator>();

builder.Services.AddScoped<ComplianceApi.Repositories.IAttendanceRegularizationRepository, ComplianceApi.Repositories.AttendanceRegularizationRepository>();
builder.Services.AddScoped<ComplianceApi.Services.IAttendanceRegularizationService, ComplianceApi.Services.AttendanceRegularizationService>();

builder.Services.AddAppRateLimiting(builder.Configuration);

var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularDev", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .WithMethods("GET", "POST", "PUT", "DELETE")
              .WithHeaders("Content-Type", "Authorization")
              .AllowCredentials()
              // Retry-After isn't one of the CORS-safelisted response headers,
              // so without this the browser silently hides it from Angular's
              // HttpClient even though the server sent it correctly.
              .WithExposedHeaders("Retry-After");
    });
});

var app = builder.Build();

// One-time startup backfill: any user created before DisplayId existed will
// have a null value after the migration runs. Assign one now so nothing in
// the UI shows blank. Cheap no-op on every later restart once everyone has one.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var idGenerator = scope.ServiceProvider.GetRequiredService<DisplayIdGenerator>();

    var usersMissingDisplayId = db.Users.Where(u => u.DisplayId == null).ToList();
    foreach (var user in usersMissingDisplayId)
    {
        user.DisplayId = idGenerator.GenerateFor(user.Role);
    }

    if (usersMissingDisplayId.Count > 0)
    {
        db.SaveChanges();
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors("AllowAngularDev");
app.UseHttpsRedirection();

// Authentication runs first so the rate limiter can partition by the
// signed-in user's id (via ClaimTypes.NameIdentifier) instead of only IP.
// UseRateLimiter runs before UseAuthorization so an over-limit caller gets
// a fast 429 without paying for an authorization check first.
app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

app.MapControllers();

app.Run();