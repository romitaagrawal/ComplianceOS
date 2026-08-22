import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ManagerService, TeamMember } from '../manager/manager';
import { ProfileService, ManagerInfo } from '../profile/profile';
import { LeaveService, LeaveApplyPayload, LEAVE_TYPES  } from '../leave/leave';
import { TaskService, TaskCreatePayload } from '../task/task';
import { AttendanceService, AttendanceLog } from '../attendance/attendance';
import { AuthService } from '../auth/auth';
import { AttendanceSummary, LeaveRequestItem, TaskItemDto, TaskStatus, TeamStats, TaskPriority } from '../core/models';
import { Shell, NavItem } from '../shared/shell/shell';
import { KpiCard } from '../shared/kpi-card/kpi-card';
import { DonutChart, ChartSlice } from '../shared/charts/donut-chart/donut-chart';
import { BarChart, BarDatum } from '../shared/charts/bar-chart/bar-chart';
import { ProgressRing } from '../shared/progress-ring/progress-ring';
import { Modal } from '../shared/modal/modal';
import { WeeklyHoursChart } from '../shared/charts/weekly-hours-chart/weekly-hours-chart';
import { AttendanceRegularization } from '../attendance-regularization/attendance-regularization';
import { Pagination } from '../shared/pagination/pagination';

type MgrTab = 'overview' | 'team' | 'tasks' | 'leave' | 'mine' | 'regularization';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, Shell, KpiCard, DonutChart, BarChart, ProgressRing, Modal, WeeklyHoursChart, AttendanceRegularization, Pagination],
  templateUrl: './manager-dashboard.html',
  styleUrl: './manager-dashboard.css'
})
export class ManagerDashboard implements OnInit {
  activeTab: MgrTab = 'overview';
  currentUserId: number | null = null;

  navItems: NavItem[] = [
    { key: 'overview', label: 'Overview', icon: 'dashboard' },
    { key: 'team', label: 'My Team', icon: 'groups' },
    { key: 'tasks', label: 'Team Tasks', icon: 'assignment' },
    { key: 'leave', label: 'Leave Requests', icon: 'event_busy' },
    { key: 'mine', label: 'My Own Work', icon: 'person' },
    { key: 'regularization', label: 'Regularization', icon: 'edit_calendar' }
  ];

  reportsTo: ManagerInfo | null = null;

  team: TeamMember[] = [];
  teamAttendance: AttendanceSummary[] = [];
  teamStats: TeamStats | null = null;
  teamError = '';

  teamLeaveRequests: LeaveRequestItem[] = [];
  teamLeaveError = '';

  teamTasks: TaskItemDto[] = [];
  teamTaskError = '';
  assignForm: TaskCreatePayload = { title: '', description: '', priority: 'Medium', deadline: null, assignedToUserId: 0 };
  assigningTask = false;
  assignError = '';
  assignSuccess = '';
  priorities: TaskPriority[] = ['Low', 'Medium', 'High'];

  // My own attendance
  todaysLog: AttendanceLog | null = null;
  logs: AttendanceLog[] = [];
  attendanceError = '';

  // My own tasks
  myTasks: TaskItemDto[] = [];
  myTaskError = '';

  showPersonalTaskForm = false;
  personalTaskForm: TaskCreatePayload = { title: '', description: '', priority: 'Medium', deadline: null, assignedToUserId: 0 };
  editingTaskId: number | null = null;
  personalTaskError = '';
  personalTaskSuccess = '';
  savingPersonalTask = false;

  // My own leave
  myLeaveRequests: LeaveRequestItem[] = [];
  myLeaveError = '';
  myLeaveSuccess = '';
leaveTypes = LEAVE_TYPES;
leaveForm: LeaveApplyPayload = { startDate: '', endDate: '', leaveType: 'Casual Leave', reason: '', attachment: null };
leaveAttachmentError = '';
downloadingAttachmentId: number | null = null;  
submittingLeave = false;

  teamAttendancePage = 1;
teamAttendancePageSize = 10;
teamAttendanceTotalCount = 0;
teamAttendancePaged: AttendanceSummary[] = [];
regularizationPrefillDate: string | null = null;

historyPage = 1;
historyPageSize = 10;
historyTotalCount = 0;
historyLogs: AttendanceLog[] = [];

  constructor(
    private managerService: ManagerService,
    private profileService: ProfileService,
    private leaveService: LeaveService,
    private taskService: TaskService,
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getUserId();

    this.loadReportsTo();
    this.loadTeam();
    this.loadTeamAttendance();
    this.loadTeamStats();
    this.loadTeamLeaveRequests();
    this.loadTeamTasks();
    this.loadMyTasks();
    this.loadMyLeaveRequests();
    this.loadMyAttendance();
     this.loadTeamAttendancePage();
     this.loadHistoryPage();
  }

  setTab(key: string): void {
    this.activeTab = key as MgrTab;
  }

  isOwnTask(task: TaskItemDto): boolean {
    return task.assignedByUserId === this.currentUserId;
  }

  // ---------- Reporting manager ----------
  loadReportsTo(): void {
    this.profileService.getMyManager().subscribe({
      next: (data) => { this.reportsTo = data; this.cdr.detectChanges(); },
      error: (err) => console.error(err)
    });
  }

  // ---------- Team ----------
  loadTeam(): void {
    this.managerService.getMyTeam().subscribe({
      next: (data) => { this.team = data; this.cdr.detectChanges(); },
      error: () => { this.teamError = 'Failed to load team members.'; this.cdr.detectChanges(); }
    });
  }

  loadTeamAttendance(): void {
    this.managerService.getTeamAttendance().subscribe({
      next: (data) => { this.teamAttendance = data; this.cdr.detectChanges(); },
      error: (err) => console.error(err)
    });
  }

  loadTeamStats(): void {
    this.managerService.getTeamStats().subscribe({
      next: (data) => { this.teamStats = data; this.cdr.detectChanges(); },
      error: (err) => console.error(err)
    });
  }

  // ---------- Team leave ----------
  loadTeamLeaveRequests(): void {
    this.leaveService.getTeamRequests().subscribe({
      next: (data) => { this.teamLeaveRequests = data; this.cdr.detectChanges(); },
      error: () => { this.teamLeaveError = 'Failed to load leave requests.'; this.cdr.detectChanges(); }
    });
  }

  onApprove(id: number): void {
    this.leaveService.actOnRequest(id, 'Approve').subscribe({
      next: () => this.loadTeamLeaveRequests(),
      error: (err) => { this.teamLeaveError = err.error || 'Failed to approve request.'; this.cdr.detectChanges(); }
    });
  }

  onReject(id: number): void {
    this.leaveService.actOnRequest(id, 'Reject').subscribe({
      next: () => this.loadTeamLeaveRequests(),
      error: (err) => { this.teamLeaveError = err.error || 'Failed to reject request.'; this.cdr.detectChanges(); }
    });
  }

  onRegularizationDecided(): void {
  this.loadTeamAttendance();
  this.loadTeamStats();
  this.loadTeamAttendancePage();
  this.loadMyAttendance();
  this.loadHistoryPage();
}

  // ---------- Team tasks ----------
  loadTeamTasks(): void {
    this.taskService.getTeamTasks().subscribe({
      next: (data) => { this.teamTasks = data; this.cdr.detectChanges(); },
      error: () => { this.teamTaskError = 'Failed to load team tasks.'; this.cdr.detectChanges(); }
    });
  }

  submitAssignTask(): void {
    this.assignError = '';
    this.assignSuccess = '';
    if (!this.assignForm.title || !this.assignForm.assignedToUserId) {
      this.assignError = 'Please choose a team member and enter a title.';
      return;
    }
    this.assigningTask = true;
    this.taskService.assignTask(this.assignForm).subscribe({
      next: () => {
        this.assigningTask = false;
        this.assignSuccess = 'Task assigned.';
        this.assignForm = { title: '', description: '', priority: 'Medium', deadline: null, assignedToUserId: 0 };
        this.cdr.detectChanges();
        this.loadTeamTasks();
      },
      error: (err) => { this.assigningTask = false; this.assignError = err.error || 'Failed to assign task.'; this.cdr.detectChanges(); }
    });
  }

  // ---------- My own attendance ----------
  loadMyAttendance(): void {
    this.attendanceService.getToday().subscribe({
      next: (data) => { this.todaysLog = data; this.cdr.detectChanges(); },
      error: (err) => console.error(err)
    });
    this.attendanceService.getMyLogs().subscribe({
      next: (data) => { this.logs = data; this.cdr.detectChanges(); },
      error: (err) => console.error(err)
    });
  }

  onClockIn(): void {
    this.attendanceError = '';
    this.attendanceService.clockIn().subscribe({
      next: () => this.loadMyAttendance(),
      error: (err) => { this.attendanceError = err.error || 'Clock-in failed.'; this.cdr.detectChanges(); }
    });
  }

  onClockOut(): void {
    this.attendanceError = '';
    this.attendanceService.clockOut().subscribe({
      next: () => this.loadMyAttendance(),
      error: (err) => { this.attendanceError = err.error || 'Clock-out failed.'; this.cdr.detectChanges(); }
    });
  }

  // ---------- My own tasks ----------
  loadMyTasks(): void {
    this.taskService.getMyTasks().subscribe({
      next: (data) => { this.myTasks = data; this.cdr.detectChanges(); },
      error: () => { this.myTaskError = 'Failed to load your tasks.'; this.cdr.detectChanges(); }
    });
  }

  updateMyTaskStatus(task: TaskItemDto, status: TaskStatus): void {
    this.taskService.updateStatus(task.id, status).subscribe({
      next: () => this.loadMyTasks(),
      error: (err) => { this.myTaskError = err.error || 'Failed to update task.'; this.cdr.detectChanges(); }
    });
  }

  nextStatus(status: TaskStatus): TaskStatus | null {
    if (status === 'Pending') return 'InProgress';
    if (status === 'InProgress') return 'Completed';
    return null;
  }

  // ---------- Personal task create/edit/delete ----------
  startCreatePersonalTask(): void {
    this.editingTaskId = null;
    this.personalTaskForm = { title: '', description: '', priority: 'Medium', deadline: null, assignedToUserId: this.currentUserId ?? 0 };
    this.personalTaskError = '';
    this.personalTaskSuccess = '';
    this.showPersonalTaskForm = true;
  }

  startEditPersonalTask(task: TaskItemDto): void {
    this.editingTaskId = task.id;
    this.personalTaskForm = {
      title: task.title,
      description: task.description,
      priority: task.priority,
      deadline: task.deadline,
      assignedToUserId: this.currentUserId ?? 0
    };
    this.personalTaskError = '';
    this.personalTaskSuccess = '';
    this.showPersonalTaskForm = true;
  }

  cancelPersonalTaskForm(): void {
    this.editingTaskId = null;
    this.personalTaskForm = { title: '', description: '', priority: 'Medium', deadline: null, assignedToUserId: 0 };
    this.personalTaskError = '';
    this.showPersonalTaskForm = false;
  }

  submitPersonalTask(): void {
    this.personalTaskError = '';
    this.personalTaskSuccess = '';
    if (!this.personalTaskForm.title) {
      this.personalTaskError = 'Title is required.';
      return;
    }
    this.personalTaskForm.assignedToUserId = this.currentUserId ?? 0;
    this.savingPersonalTask = true;

    const request$ = this.editingTaskId
      ? this.taskService.updateTask(this.editingTaskId, this.personalTaskForm)
      : this.taskService.assignTask(this.personalTaskForm);

    request$.subscribe({
      next: () => {
        this.savingPersonalTask = false;
        this.personalTaskSuccess = this.editingTaskId ? 'Task updated.' : 'Task created.';
        this.editingTaskId = null;
        this.showPersonalTaskForm = false;
        this.personalTaskForm = { title: '', description: '', priority: 'Medium', deadline: null, assignedToUserId: 0 };
        this.cdr.detectChanges();
        this.loadMyTasks();
      },
      error: (err) => { this.savingPersonalTask = false; this.personalTaskError = err.error || 'Failed to save task.'; this.cdr.detectChanges(); }
    });
  }

  deletePersonalTask(task: TaskItemDto): void {
    if (!confirm(`Delete "${task.title}"?`)) return;
    this.taskService.deleteTask(task.id).subscribe({
      next: () => this.loadMyTasks(),
      error: (err) => { this.personalTaskError = err.error || 'Failed to delete task.'; this.cdr.detectChanges(); }
    });
  }

  // ---------- My own leave ----------
  loadMyLeaveRequests(): void {
    this.leaveService.getMyRequests().subscribe({
      next: (data) => { this.myLeaveRequests = data; this.cdr.detectChanges(); },
      error: (err) => console.error(err)
    });
  }

  submitMyLeave(): void {
  this.myLeaveError = '';
  this.myLeaveSuccess = '';
  if (!this.leaveForm.startDate || !this.leaveForm.endDate) {
    this.myLeaveError = 'Please choose a start and end date.';
    return;
  }
  if (this.isMedicalLeaveSelected && !this.leaveForm.attachment) {
    this.myLeaveError = 'A supporting document is required for Medical Leave.';
    return;
  }
  this.submittingLeave = true;
  this.leaveService.apply(this.leaveForm).subscribe({
    next: () => {
      this.submittingLeave = false;
      this.myLeaveSuccess = 'Leave request submitted.';
      this.leaveForm = { startDate: '', endDate: '', leaveType: 'Casual Leave', reason: '', attachment: null };
      this.cdr.detectChanges();
      this.loadMyLeaveRequests();
    },
    error: (err) => { this.submittingLeave = false; this.myLeaveError = err.error || 'Failed to submit leave request.'; this.cdr.detectChanges(); }
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
      this.myLeaveError = 'Failed to download attachment.';
      this.cdr.detectChanges();
    }
  });
}
  

  // ---------- Derived chart data ----------
  get overtimeChart(): ChartSlice[] {
    const overtime = this.teamAttendance.filter((a) => a.isOvertimeFlagged).length;
    const normal = this.teamAttendance.length - overtime;
    return [
      { label: 'Normal', value: normal, color: '#3050e0' },
      { label: 'Overtime', value: overtime, color: '#dc2626' }
    ];
  }

  get teamLeaveChart(): ChartSlice[] {
    const counts = { Pending: 0, Approved: 0, Rejected: 0 };
    this.teamLeaveRequests.forEach((l) => { counts[l.status]++; });
    return [
      { label: 'Pending', value: counts.Pending, color: '#d97706' },
      { label: 'Approved', value: counts.Approved, color: '#16a34a' },
      { label: 'Rejected', value: counts.Rejected, color: '#dc2626' }
    ];
  }

  get teamTaskStatusChart(): BarDatum[] {
    const counts = { Pending: 0, InProgress: 0, Completed: 0 };
    this.teamTasks.forEach((t) => { counts[t.status]++; });
    return [
      { label: 'Pending', value: counts.Pending, color: '#d97706' },
      { label: 'In Progress', value: counts.InProgress, color: '#1e40af' },
      { label: 'Completed', value: counts.Completed, color: '#16a34a' }
    ];
  }

  get myTaskCompletionPercent(): number {
    if (this.myTasks.length === 0) return 0;
    const completed = this.myTasks.filter((t) => t.status === 'Completed').length;
    return Math.round((completed / this.myTasks.length) * 100);
  }

  get pendingTeamLeaveCount(): number {
    return this.teamLeaveRequests.filter((l) => l.status === 'Pending').length;
  }

  // ---- methods (add if missing) ----
loadTeamAttendancePage(): void {
  this.managerService.getTeamAttendancePaged(this.teamAttendancePage, this.teamAttendancePageSize).subscribe({
    next: (res) => {
      this.teamAttendancePaged = res.items;
      this.teamAttendanceTotalCount = res.totalCount;
      this.cdr.detectChanges();
    },
    error: () => this.cdr.detectChanges()
  });
}

onTeamAttendancePageChange(page: number): void {
  this.teamAttendancePage = page;
  this.loadTeamAttendancePage();
}

onRegularizeDate(dateIso: string): void {
  this.regularizationPrefillDate = dateIso;
  this.activeTab = 'regularization';
}
onTeamAttendancePageSizeChange(size: number): void {
  this.teamAttendancePageSize = size;
  this.teamAttendancePage = 1;
  this.loadTeamAttendancePage();
}

loadHistoryPage(): void {
  this.attendanceService.getMyLogsPaged(this.historyPage, this.historyPageSize).subscribe({
    next: (res) => { this.historyLogs = res.items; this.historyTotalCount = res.totalCount; this.cdr.detectChanges(); },
    error: () => this.cdr.detectChanges()
  });
}

onHistoryPageChange(page: number): void {
  this.historyPage = page;
  this.loadHistoryPage();
}

onHistoryPageSizeChange(size: number): void {
  this.historyPageSize = size;
  this.historyPage = 1;
  this.loadHistoryPage();
}
teamTasksPage = 1;
teamTasksPageSize = 10;

get pagedTeamTasks(): TaskItemDto[] {
  const start = (this.teamTasksPage - 1) * this.teamTasksPageSize;
  return this.teamTasks.slice(start, start + this.teamTasksPageSize);
}

onTeamTasksPageSizeChange(size: number): void {
  this.teamTasksPageSize = size;
  this.teamTasksPage = 1;
}

teamLeavePage = 1;
teamLeavePageSize = 10;

get pagedTeamLeaveRequests(): LeaveRequestItem[] {
  const start = (this.teamLeavePage - 1) * this.teamLeavePageSize;
  return this.teamLeaveRequests.slice(start, start + this.teamLeavePageSize);
}

onTeamLeavePageSizeChange(size: number): void {
  this.teamLeavePageSize = size;
  this.teamLeavePage = 1;
}

myTasksPage = 1;
myTasksPageSize = 10;

get pagedMyTasks(): TaskItemDto[] {
  const start = (this.myTasksPage - 1) * this.myTasksPageSize;
  return this.myTasks.slice(start, start + this.myTasksPageSize);
}

onMyTasksPageSizeChange(size: number): void {
  this.myTasksPageSize = size;
  this.myTasksPage = 1;
}

myLeavePage = 1;
myLeavePageSize = 10;

get pagedMyLeaveRequests(): LeaveRequestItem[] {
  const start = (this.myLeavePage - 1) * this.myLeavePageSize;
  return this.myLeaveRequests.slice(start, start + this.myLeavePageSize);
}

onMyLeavePageSizeChange(size: number): void {
  this.myLeavePageSize = size;
  this.myLeavePage = 1;
}
}