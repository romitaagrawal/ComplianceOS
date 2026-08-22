import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AttendanceService, AttendanceLog } from '../attendance/attendance';
import { ProfileService, MyProfile, ManagerInfo } from '../profile/profile';
import { LeaveService, LeaveApplyPayload, LEAVE_TYPES } from '../leave/leave';
import { TaskService } from '../task/task';
import { LeaveRequestItem, TaskItemDto, TaskStatus } from '../core/models';
import { Shell, NavItem } from '../shared/shell/shell';
import { KpiCard } from '../shared/kpi-card/kpi-card';
import { DonutChart, ChartSlice } from '../shared/charts/donut-chart/donut-chart';
import { BarChart, BarDatum } from '../shared/charts/bar-chart/bar-chart';
import { ProgressRing } from '../shared/progress-ring/progress-ring';
import { WeeklyHoursChart } from '../shared/charts/weekly-hours-chart/weekly-hours-chart';
import { sumHoursInCurrentWeek } from '../core/date-utils';
import { AttendanceRegularization } from '../attendance-regularization/attendance-regularization';
import { Pagination } from '../shared/pagination/pagination';


type EmpSection = 'overview' | 'attendance' | 'tasks' | 'leave' | 'regularization';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, Shell, KpiCard, DonutChart, ProgressRing, WeeklyHoursChart, AttendanceRegularization, Pagination],
  templateUrl: './employee-dashboard.html',
  styleUrl: './employee-dashboard.css'
})
export class EmployeeDashboard implements OnInit {
  activeSection: EmpSection = 'overview';
  navItems: NavItem[] = [
    { key: 'overview', label: 'Overview', icon: 'dashboard' },
    { key: 'attendance', label: 'Attendance', icon: 'schedule' },
    { key: 'tasks', label: 'My Tasks', icon: 'checklist' },
    { key: 'leave', label: 'My Leave', icon: 'event_busy' },
    { key: 'regularization', label: 'Regularization', icon: 'edit_calendar' }
  ];

  // Attendance
  logs: AttendanceLog[] = [];
  todaysLog: AttendanceLog | null = null;
  attendanceError = '';

  // Profile
  myProfile: MyProfile | null = null;
  myManager: ManagerInfo | null = null;

  // Tasks
  tasks: TaskItemDto[] = [];
  tasksLoading = true;
  taskError = '';

  // Leave
  leaveRequests: LeaveRequestItem[] = [];
  leaveLoading = true;
  leaveError = '';
  leaveSuccess = '';
  leaveTypes = LEAVE_TYPES;
leaveForm: LeaveApplyPayload = { startDate: '', endDate: '', leaveType: 'Casual Leave', reason: '', attachment: null };
leaveAttachmentError = '';
downloadingAttachmentId: number | null = null;
  submittingLeave = false;

  constructor(
    private attendanceService: AttendanceService,
    private profileService: ProfileService,
    private leaveService: LeaveService,
    private taskService: TaskService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadToday();
    this.loadLogs();
    this.loadProfile();
    this.loadTasks();
    this.loadLeaveRequests();
    this.loadHistoryPage();
  }

  setSection(key: string): void {
    this.activeSection = key as EmpSection;
  }

  // ---------- Profile ----------
  loadProfile(): void {
    this.profileService.getMe().subscribe({
      next: (data) => { this.myProfile = data; this.cdr.detectChanges(); },
      error: (err) => console.error('Failed to load profile:', err)
    });
    this.profileService.getMyManager().subscribe({
      next: (data) => { this.myManager = data; this.cdr.detectChanges(); },
      error: (err) => console.error('Failed to load manager info:', err)
    });
  }

  // ---------- Attendance ----------
  loadToday(): void {
    this.attendanceService.getToday().subscribe({
      next: (data) => { this.todaysLog = data; this.cdr.detectChanges(); },
      error: (err) => console.error(err)
    });
  }

  loadLogs(): void {
    this.attendanceService.getMyLogs().subscribe({
      next: (data) => { this.logs = data; this.cdr.detectChanges(); },
      error: (err) => console.error(err)
    });
  }

  onClockIn(): void {
    this.attendanceError = '';
    this.attendanceService.clockIn().subscribe({
      next: () => { this.loadToday(); this.loadLogs(); },
      error: (err) => { this.attendanceError = err.error || 'Clock-in failed.'; this.cdr.detectChanges(); }
    });
  }

  onClockOut(): void {
    this.attendanceError = '';
    this.attendanceService.clockOut().subscribe({
      next: () => { this.loadToday(); this.loadLogs(); },
      error: (err) => { this.attendanceError = err.error || 'Clock-out failed.'; this.cdr.detectChanges(); }
    });
  }

  // ---------- Tasks ----------
  loadTasks(): void {
    this.tasksLoading = true;
    this.taskService.getMyTasks().subscribe({
      next: (data) => { this.tasks = data; this.tasksLoading = false; this.cdr.detectChanges(); },
      error: () => { this.taskError = 'Failed to load tasks.'; this.tasksLoading = false; this.cdr.detectChanges(); }
    });
  }

  updateTaskStatus(task: TaskItemDto, status: TaskStatus): void {
    this.taskService.updateStatus(task.id, status).subscribe({
      next: () => this.loadTasks(),
      error: (err) => { this.taskError = err.error || 'Failed to update task status.'; this.cdr.detectChanges(); }
    });
  }

  nextStatus(status: TaskStatus): TaskStatus | null {
    if (status === 'Pending') return 'InProgress';
    if (status === 'InProgress') return 'Completed';
    return null;
  }

  // ---------- Leave ----------
  loadLeaveRequests(): void {
    this.leaveLoading = true;
    this.leaveService.getMyRequests().subscribe({
      next: (data) => { this.leaveRequests = data; this.leaveLoading = false; this.cdr.detectChanges(); },
      error: () => { this.leaveError = 'Failed to load leave requests.'; this.leaveLoading = false; this.cdr.detectChanges(); }
    });
  }

  submitLeave(): void {
  this.leaveError = '';
  this.leaveSuccess = '';
  if (!this.leaveForm.startDate || !this.leaveForm.endDate) {
    this.leaveError = 'Please choose a start and end date.';
    return;
  }
  if (this.isMedicalLeaveSelected && !this.leaveForm.attachment) {
    this.leaveError = 'A supporting document is required for Medical Leave.';
    return;
  }
  this.submittingLeave = true;
  this.leaveService.apply(this.leaveForm).subscribe({
    next: () => {
      this.submittingLeave = false;
      this.leaveSuccess = 'Leave request submitted.';
      this.leaveForm = { startDate: '', endDate: '', leaveType: 'Casual Leave', reason: '', attachment: null };
      this.cdr.detectChanges();
      this.loadLeaveRequests();
    },
    error: (err) => { this.submittingLeave = false; this.leaveError = err.error || 'Failed to submit leave request.'; this.cdr.detectChanges(); }
  });
}

  get isMedicalLeaveSelected(): boolean {
  return this.leaveForm.leaveType === 'Medical Leave';
}

onLeaveFileSelected(event: Event): void {
  this.leaveAttachmentError = '';
  const input = event.target as HTMLInputElement;
  const file = input.files && input.files.length > 0 ? input.files[0] : null;

  if (file) {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.pdf', '.jpg', '.jpeg', '.png'].includes(ext)) {
      this.leaveAttachmentError = 'Only PDF, JPG, JPEG, and PNG files are allowed.';
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.leaveAttachmentError = 'Attachment must be smaller than 5 MB.';
      input.value = '';
      return;
    }
  }

  this.leaveForm.attachment = file;
}

removeLeaveAttachment(fileInput: HTMLInputElement): void {
  this.leaveForm.attachment = null;
  this.leaveAttachmentError = '';
  fileInput.value = '';
}

downloadAttachment(request: LeaveRequestItem): void {
  if (!request.hasAttachment) return;
  this.downloadingAttachmentId = request.id;
  this.leaveService.downloadAttachment(request.id).subscribe({
    next: (blob) => {
      this.downloadingAttachmentId = null;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = request.attachmentFileName || 'attachment';
      a.click();
      window.URL.revokeObjectURL(url);
      this.cdr.detectChanges();
    },
    error: () => {
      this.downloadingAttachmentId = null;
      this.leaveError = 'Failed to download attachment.';
      this.cdr.detectChanges();
    }
  });
}

  onRegularizationDecided(): void {
  this.loadToday();
  this.loadLogs();
  this.loadHistoryPage();
}

  // ---------- Derived chart data (no new API calls — computed from loaded arrays) ----------
  get taskStatusChart(): ChartSlice[] {
    const counts = { Pending: 0, InProgress: 0, Completed: 0 };
    this.tasks.forEach((t) => { counts[t.status]++; });
    return [
      { label: 'Pending', value: counts.Pending, color: '#d97706' },
      { label: 'In Progress', value: counts.InProgress, color: '#1e40af' },
      { label: 'Completed', value: counts.Completed, color: '#16a34a' }
    ];
  }

  get leaveStatusChart(): ChartSlice[] {
    const counts = { Pending: 0, Approved: 0, Rejected: 0 };
    this.leaveRequests.forEach((l) => { counts[l.status]++; });
    return [
      { label: 'Pending', value: counts.Pending, color: '#d97706' },
      { label: 'Approved', value: counts.Approved, color: '#16a34a' },
      { label: 'Rejected', value: counts.Rejected, color: '#dc2626' }
    ];
  }

  get attendanceBarData(): BarDatum[] {
    return [...this.logs]
      .slice(0, 7)
      .reverse()
      .map((l) => ({
        label: new Date(l.clockIn).toLocaleDateString('en-US', { weekday: 'short' }),
        value: Math.round((l.totalHours || 0) * 10) / 10,
        color: l.isOvertimeFlagged ? '#dc2626' : '#3050e0'
      }));
  }

  get taskCompletionPercent(): number {
    if (this.tasks.length === 0) return 0;
    const completed = this.tasks.filter((t) => t.status === 'Completed').length;
    return Math.round((completed / this.tasks.length) * 100);
  }

  get completedTaskCount(): number {
    return this.tasks.filter((t) => t.status === 'Completed').length;
  }

  get pendingLeaveCount(): number {
    return this.leaveRequests.filter((l) => l.status === 'Pending').length;
  }

  get weeklyHours(): number {
  return sumHoursInCurrentWeek(this.logs);
}

  historyPage = 1;
historyPageSize = 10;
historyTotalCount = 0;
historyLogs: AttendanceLog[] = [];

loadHistoryPage(): void {
  this.attendanceService.getMyLogsPaged(this.historyPage, this.historyPageSize).subscribe({
    next: (res) => { this.historyLogs = res.items; this.historyTotalCount = res.totalCount; this.cdr.detectChanges(); },
    error: () => { this.attendanceError = 'Failed to load attendance history.'; this.cdr.detectChanges(); }
  });
}

onHistoryPageChange(page: number): void {
  this.historyPage = page;
  this.loadHistoryPage();
}

regularizationPrefillDate: string | null = null;

onRegularizeDate(dateIso: string): void {
  this.regularizationPrefillDate = dateIso;
  this.activeSection = 'regularization';
}

onHistoryPageSizeChange(size: number): void {
  this.historyPageSize = size;
  this.historyPage = 1;
  this.loadHistoryPage();
}

tasksPage = 1;
tasksPageSize = 10;

get pagedTasks(): TaskItemDto[] {
  const start = (this.tasksPage - 1) * this.tasksPageSize;
  return this.tasks.slice(start, start + this.tasksPageSize);
}

onTasksPageSizeChange(size: number): void {
  this.tasksPageSize = size;
  this.tasksPage = 1;
}

leavePage = 1;
leavePageSize = 10;

get pagedLeaveRequests(): LeaveRequestItem[] {
  const start = (this.leavePage - 1) * this.leavePageSize;
  return this.leaveRequests.slice(start, start + this.leavePageSize);
}

onLeavePageSizeChange(size: number): void {
  this.leavePageSize = size;
  this.leavePage = 1;
}
}