using Microsoft.EntityFrameworkCore;
using ComplianceApi.Models;

namespace ComplianceApi.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
        public DbSet<User> Users { get; set; }
        public DbSet<AttendanceLog> AttendanceLogs { get; set; }
        public DbSet<LeaveRequest> LeaveRequests { get; set; }
        public DbSet<Department> Departments { get; set; }
        public DbSet<TaskItem> Tasks { get; set; }
        public DbSet<AttendanceRegularization> AttendanceRegularizations { get; set; }
        public DbSet<PasswordResetRequest> PasswordResetRequests { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>()
                .Property(u => u.CreatedAt)
                .HasDefaultValueSql("SYSUTCDATETIME()");

            // A task's two User relationships (AssignedTo / AssignedBy) both
            // point at the same Users table. Without Restrict here, EF tries
            // to cascade-delete on both paths and SQL Server rejects that as
            // a multiple-cascade-path cycle.
            modelBuilder.Entity<TaskItem>()
                .HasOne(t => t.AssignedTo)
                .WithMany()
                .HasForeignKey(t => t.AssignedToUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<TaskItem>()
                .HasOne(t => t.AssignedBy)
                .WithMany()
                .HasForeignKey(t => t.AssignedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // AttendanceRegularization touches Users twice (requester + decider) and
            // AttendanceLogs once — without Restrict here, EF sees multiple possible
            // cascade-delete paths back to Users and SQL Server rejects it, exactly
            // like the TaskItem AssignedTo/AssignedBy case above.
            modelBuilder.Entity<AttendanceRegularization>()
                .HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<AttendanceRegularization>()
                .HasOne(r => r.DecidedByUser)
                .WithMany()
                .HasForeignKey(r => r.DecidedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<AttendanceRegularization>()
                .HasOne(r => r.AttendanceLog)
                .WithMany()
                .HasForeignKey(r => r.AttendanceLogId)
                .OnDelete(DeleteBehavior.Restrict);

            // PasswordResetRequest touches Users twice (requester + the HR user who
            // resolved it) — same multiple-cascade-path issue as everywhere else.
            modelBuilder.Entity<PasswordResetRequest>()
                .HasOne(p => p.User)
                .WithMany()
                .HasForeignKey(p => p.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PasswordResetRequest>()
                .HasOne(p => p.ResolvedByUser)
                .WithMany()
                .HasForeignKey(p => p.ResolvedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}