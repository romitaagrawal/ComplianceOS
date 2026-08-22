import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../auth/auth';
import { AttendanceService, AttendanceLog } from '../attendance/attendance';
import { ProfileService, MyProfile, ManagerInfo } from '../profile/profile';
import { LeaveService, LeaveApplyPayload, LEAVE_TYPES } from '../leave/leave';
import { TaskService, TaskCreatePayload } from '../task/task';
import { HrService, RegisterEmployeePayload } from '../hr/hr';
import { DepartmentService } from '../department/department';
import { WeeklyHoursChart } from '../shared/charts/weekly-hours-chart/weekly-hours-chart';
import {
  UserSummary,
  AttendanceSummary,
  LeaveRequestItem,
  EmployeeListItem,
  ManagerOption,
  HrTeamMember,
  Department,
  OrgNode,
  TaskItemDto,
  TaskStatus,
  TaskPriority,
  UserRole,
  AccountStatus
} from '../core/models';
import { Shell, NavItem } from '../shared/shell/shell';
import { KpiCard } from '../shared/kpi-card/kpi-card';
import { DonutChart, ChartSlice } from '../shared/charts/donut-chart/donut-chart';
import { BarChart, BarDatum } from '../shared/charts/bar-chart/bar-chart';
import { ProgressRing } from '../shared/progress-ring/progress-ring';
import { Modal } from '../shared/modal/modal';
import { OrgTree } from '../shared/org-tree/org-tree';
import { AttendanceRegularization } from '../attendance-regularization/attendance-regularization';
import { Pagination } from '../shared/pagination/pagination';
import { PasswordResetRequestItem } from '../core/models';

type HrTab = 'overview' | 'mine' | 'employees' | 'managers' | 'departments' | 'hrTeam' | 'hierarchy' | 'leave' | 'regularization' | 'passwordResets';

@Component({
  selector: 'app-hr-dashboard',
  standalone: true,
imports: [CommonModule, FormsModule, Shell, KpiCard, DonutChart, BarChart, ProgressRing, Modal, OrgTree, WeeklyHoursChart, AttendanceRegularization, Pagination ],  
templateUrl: './hr-dashboard.html',
  styleUrl: './hr-dashboard.css'
})
export class HrDashboard implements OnInit {
  activeTab: HrTab = 'mine';
  isHrManager = false;
  currentUserId: number | null = null;

  navItems: NavItem[] = [];

  private buildNavItems(): void {
    const items: NavItem[] = [
      { key: 'mine', label: 'My Work', icon: 'person' },
      { key: 'leave', label: 'Leave Requests', icon: 'event_busy' },
      { key: 'hierarchy', label: 'Org Hierarchy', icon: 'account_tree' },
      { key: 'regularization', label: 'Regularization', icon: 'edit_calendar' },
      { key: 'passwordResets', label: 'Password Resets', icon: 'password' }
    ];
    if (this.isHrManager) {
      items.splice(1, 0, { key: 'overview', label: 'Overview', icon: 'dashboard' });
      items.push(
        { key: 'employees', label: 'Employees', icon: 'badge' },
        { key: 'managers', label: 'Managers', icon: 'supervisor_account' },
        { key: 'departments', label: 'Departments', icon: 'apartment' },
        { key: 'hrTeam', label: 'My HR Team', icon: 'diversity_3' }
      );
    }
    this.navItems = items;
  }

  // ---------- Personal ----------
  myProfile: MyProfile | null = null;
  myManager: ManagerInfo | null = null;
  todaysLog: AttendanceLog | null = null;
  logs: AttendanceLog[] = [];
  attendanceError = '';

  myTasks: TaskItemDto[] = [];
  myTaskError = '';

  showPersonalTaskForm = false;
  personalTaskForm: TaskCreatePayload = { title: '', description: '', priority: 'Medium', deadline: null, assignedToUserId: 0 };
  editingTaskId: number | null = null;
  personalTaskError = '';
  personalTaskSuccess = '';
  savingPersonalTask = false;

  myLeaveRequests: LeaveRequestItem[] = [];
leaveTypes = LEAVE_TYPES;
leaveForm: LeaveApplyPayload = { startDate: '', endDate: '', leaveType: 'Casual Leave', reason: '', attachment: null };
leaveAttachmentError = '';
downloadingAttachmentId: number | null = null;  
submittingLeave = false;
  myLeaveError = '';
  myLeaveSuccess = '';

  // ---------- HR Manager: org-wide employee list ----------
  employees: EmployeeListItem[] = [];
  employeesError = '';
  roles: UserRole[] = ['Employee', 'Manager', 'HREmployee', 'HRManager'];

  // ---------- HR Manager: managers list ----------
  managers: ManagerOption[] = [];

  // ---------- HR Manager: departments ----------
  departments: Department[] = [];
  showDeptModal = false;
  newDeptName = '';
  newDeptDescription = '';
  deptError = '';
  deptSuccess = '';

  // ---------- HR Manager: register employee ----------
  showRegisterModal = false;
  registerForm: RegisterEmployeePayload = {
    fullName: '',
    email: '',
    password: '',
    role: 'Employee',
    managerId: null,
    departmentId: null
  };
  registering = false;
  registerError = '';
  registerSuccess = '';

  // ---------- HR Manager: my HR team ----------
  hrTeam: HrTeamMember[] = [];
  hrTeamError = '';
  hrTeamTasks: TaskItemDto[] = [];
  assignForm: TaskCreatePayload = { title: '', description: '', priority: 'Medium', deadline: null, assignedToUserId: 0 };
  priorities: TaskPriority[] = ['Low', 'Medium', 'High'];
  assigningTask = false;
  assignError = '';
  assignSuccess = '';

  // ---------- Hierarchy ----------
  hierarchy: OrgNode[] = [];

  // ---------- Team leave ----------
  teamLeaveRequests: LeaveRequestItem[] = [];
  teamLeaveError = '';

  // ---------- Org-wide overview ----------
  allUsers: UserSummary[] = [];
  allAttendance: AttendanceSummary[] = [];
  allLeave: LeaveRequestItem[] = [];

  constructor(
    private authService: AuthService,
    private attendanceService: AttendanceService,
    private profileService: ProfileService,
    private leaveService: LeaveService,
    private taskService: TaskService,
    private hrService: HrService,
    private departmentService: DepartmentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isHrManager = this.authService.getRole() === 'HRManager';
    this.currentUserId = this.authService.getUserId();
    this.buildNavItems();

    this.loadProfile();
    this.loadAttendance();
    this.loadMyTasks();
    this.loadMyLeave();
    this.loadHierarchy();
    this.loadTeamLeaveRequests();
    this.loadHistoryPage();
    this.loadPasswordResetRequests();

    if (this.isHrManager) {
      this.loadEmployees();
      this.loadManagers();
      this.loadDepartments();
      this.loadHrTeam();
      this.loadHrTeamTasks();
      this.loadOverview();
    }
  }

  setTab(key: string): void {
    this.activeTab = key as HrTab;
  }

  isOwnTask(task: TaskItemDto): boolean {
    return task.assignedByUserId === this.currentUserId;
  }

  nextStatus(status: TaskStatus): TaskStatus | null {
    if (status === 'Pending') return 'InProgress';
    if (status === 'InProgress') return 'Completed';
    return null;
  }

  // ================= Personal =================
  loadProfile(): void {
    this.profileService.getMe().subscribe({ next: (d) => { this.myProfile = d; this.cdr.detectChanges(); }, error: (e) => console.error(e) });
    this.profileService.getMyManager().subscribe({ next: (d) => { this.myManager = d; this.cdr.detectChanges(); }, error: (e) => console.error(e) });
  }

  loadAttendance(): void {
    this.attendanceService.getToday().subscribe({ next: (d) => { this.todaysLog = d; this.cdr.detectChanges(); }, error: (e) => console.error(e) });
    this.attendanceService.getMyLogs().subscribe({ next: (d) => { this.logs = d; this.cdr.detectChanges(); }, error: (e) => console.error(e) });
  }

  onClockIn(): void {
    this.attendanceError = '';
    this.attendanceService.clockIn().subscribe({
      next: () => this.loadAttendance(),
      error: (err) => { this.attendanceError = err.error || 'Clock-in failed.'; this.cdr.detectChanges(); }
    });
  }

  onClockOut(): void {
    this.attendanceError = '';
    this.attendanceService.clockOut().subscribe({
      next: () => this.loadAttendance(),
      error: (err) => { this.attendanceError = err.error || 'Clock-out failed.'; this.cdr.detectChanges(); }
    });
  }

  loadMyTasks(): void {
    this.taskService.getMyTasks().subscribe({
      next: (d) => { this.myTasks = d; this.cdr.detectChanges(); },
      error: () => { this.myTaskError = 'Failed to load tasks.'; this.cdr.detectChanges(); }
    });
  }

  updateMyTaskStatus(task: TaskItemDto, status: TaskStatus): void {
    this.taskService.updateStatus(task.id, status).subscribe({
      next: () => this.loadMyTasks(),
      error: (err) => { this.myTaskError = err.error || 'Failed to update task.'; this.cdr.detectChanges(); }
    });
  }

  // ---------- Personal task create/edit/delete (HR Manager only) ----------
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

  loadMyLeave(): void {
    this.leaveService.getMyRequests().subscribe({ next: (d) => { this.myLeaveRequests = d; this.cdr.detectChanges(); }, error: (e) => console.error(e) });
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
      this.loadMyLeave();
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

  // ================= Hierarchy =================
  loadHierarchy(): void {
    this.hrService.getHierarchy().subscribe({ next: (d) => { this.hierarchy = d; this.cdr.detectChanges(); }, error: (e) => console.error(e) });
  }

  // ================= Team leave =================
  loadTeamLeaveRequests(): void {
    this.leaveService.getTeamRequests().subscribe({
      next: (d) => { this.teamLeaveRequests = d; this.cdr.detectChanges(); },
      error: () => { this.teamLeaveError = ''; this.cdr.detectChanges(); }
    });
  }

  onApproveTeam(id: number): void {
    this.leaveService.actOnRequest(id, 'Approve').subscribe({
      next: () => this.loadTeamLeaveRequests(),
      error: (err) => { this.teamLeaveError = err.error || 'Failed to approve request.'; this.cdr.detectChanges(); }
    });
  }

  onRejectTeam(id: number): void {
    this.leaveService.actOnRequest(id, 'Reject').subscribe({
      next: () => this.loadTeamLeaveRequests(),
      error: (err) => { this.teamLeaveError = err.error || 'Failed to reject request.'; this.cdr.detectChanges(); }
    });
  }

  // ================= HR Manager only =================
  loadEmployees(): void {
    this.hrService.getEmployeeList().subscribe({
      next: (d) => { this.employees = d; this.cdr.detectChanges(); },
      error: () => { this.employeesError = 'Failed to load employee list.'; this.cdr.detectChanges(); }
    });
  }

  loadManagers(): void {
    this.hrService.getManagers().subscribe({ next: (d) => { this.managers = d; this.cdr.detectChanges(); }, error: (e) => console.error(e) });
  }

  loadDepartments(): void {
    this.departmentService.getAll().subscribe({ next: (d) => { this.departments = d; this.cdr.detectChanges(); }, error: (e) => console.error(e) });
  }

  openDeptModal(): void {
    this.newDeptName = '';
    this.newDeptDescription = '';
    this.deptError = '';
    this.deptSuccess = '';
    this.showDeptModal = true;
  }

  createDepartment(): void {
    this.deptError = '';
    this.deptSuccess = '';
    if (!this.newDeptName.trim()) {
      this.deptError = 'Department name is required.';
      return;
    }
    this.departmentService.create(this.newDeptName.trim(), this.newDeptDescription.trim() || null).subscribe({
      next: () => {
        this.deptSuccess = 'Department created.';
        this.newDeptName = '';
        this.newDeptDescription = '';
        this.cdr.detectChanges();
        this.loadDepartments();
      },
      error: (err) => { this.deptError = err.error || 'Failed to create department.'; this.cdr.detectChanges(); }
    });
  }

  openRegisterModal(): void {
    this.registerForm = { fullName: '', email: '', password: '', role: 'Employee', managerId: null, departmentId: null };
    this.registerError = '';
    this.registerSuccess = '';
    this.showRegisterModal = true;
  }

  submitRegister(): void {
    this.registerError = '';
    this.registerSuccess = '';
    if (!this.registerForm.fullName || !this.registerForm.email || !this.registerForm.password) {
      this.registerError = 'Full name, email, and password are required.';
      return;
    }
    this.registering = true;
    this.hrService.registerEmployee(this.registerForm).subscribe({
      next: (res) => {
        this.registering = false;
        this.registerSuccess = `${res.fullName} registered as ${res.role} (${res.displayId}).`;
        this.registerForm = { fullName: '', email: '', password: '', role: 'Employee', managerId: null, departmentId: null };
        this.cdr.detectChanges();
        this.loadEmployees();
        this.loadManagers();
        this.loadHierarchy();
      },
      error: (err) => { this.registering = false; this.registerError = err.error || 'Failed to register employee.'; this.cdr.detectChanges(); }
    });
  }

  changeRole(emp: EmployeeListItem, role: UserRole): void {
    this.hrService.changeRole(emp.id, role).subscribe({
      next: () => this.loadEmployees(),
      error: (err) => { this.employeesError = err.error || 'Failed to update role.'; this.cdr.detectChanges(); }
    });
  }

  toggleStatus(emp: EmployeeListItem): void {
    const newStatus: AccountStatus = emp.accountStatus === 'Active' ? 'Inactive' : 'Active';
    this.hrService.setStatus(emp.id, newStatus).subscribe({
      next: () => this.loadEmployees(),
      error: (err) => { this.employeesError = err.error || 'Failed to update status.'; this.cdr.detectChanges(); }
    });
  }

  loadHrTeam(): void {
    this.hrService.getMyHrTeam().subscribe({
      next: (d) => { this.hrTeam = d; this.cdr.detectChanges(); },
      error: () => { this.hrTeamError = 'Failed to load HR team.'; this.cdr.detectChanges(); }
    });
  }

  loadHrTeamTasks(): void {
    this.taskService.getTeamTasks().subscribe({ next: (d) => { this.hrTeamTasks = d; this.cdr.detectChanges(); }, error: (e) => console.error(e) });
  }

  submitAssignHrTask(): void {
    this.assignError = '';
    this.assignSuccess = '';
    if (!this.assignForm.title || !this.assignForm.assignedToUserId) {
      this.assignError = 'Please choose an HR team member and enter a title.';
      return;
    }
    this.assigningTask = true;
    this.taskService.assignTask(this.assignForm).subscribe({
      next: () => {
        this.assigningTask = false;
        this.assignSuccess = 'Task assigned.';
        this.assignForm = { title: '', description: '', priority: 'Medium', deadline: null, assignedToUserId: 0 };
        this.cdr.detectChanges();
        this.loadHrTeamTasks();
      },
      error: (err) => { this.assigningTask = false; this.assignError = err.error || 'Failed to assign task.'; this.cdr.detectChanges(); }
    });
  }

  loadOverview(): void {
    this.hrService.getAllUsers().subscribe({ next: (d) => { this.allUsers = d; this.cdr.detectChanges(); }, error: (e) => console.error(e) });
    this.hrService.getAllAttendance().subscribe({ next: (d) => { this.allAttendance = d; this.cdr.detectChanges(); }, error: (e) => console.error(e) });
    this.hrService.getAllLeaveRequests().subscribe({ next: (d) => { this.allLeave = d; this.cdr.detectChanges(); }, error: (e) => console.error(e) });
  }

  countFlagged(): number {
    return this.allAttendance.filter((a) => a.isOvertimeFlagged).length;
  }

  onRegularizationDecided(): void {
  this.loadAttendance();
  this.loadHistoryPage();
  if (this.isHrManager) {
    this.loadOverview();
  }
}

  // ================= Derived chart data =================
  get roleDistributionChart(): ChartSlice[] {
    const counts: Record<string, number> = { Employee: 0, Manager: 0, HREmployee: 0, HRManager: 0 };
    this.allUsers.forEach((u) => { counts[u.role] = (counts[u.role] || 0) + 1; });
    return [
      { label: 'Employees', value: counts['Employee'], color: '#d97706' },
      { label: 'Managers', value: counts['Manager'], color: '#1e40af' },
      { label: 'HR Employees', value: counts['HREmployee'], color: '#5b21b6' },
      { label: 'HR Managers', value: counts['HRManager'], color: '#9d174d' }
    ];
  }

  get accountStatusChart(): ChartSlice[] {
    const active = this.allUsers.filter((u) => u.accountStatus === 'Active').length;
    const inactive = this.allUsers.length - active;
    return [
      { label: 'Active', value: active, color: '#16a34a' },
      { label: 'Inactive', value: inactive, color: '#dc2626' }
    ];
  }

  get orgLeaveStatusChart(): ChartSlice[] {
    const counts = { Pending: 0, Approved: 0, Rejected: 0 };
    this.allLeave.forEach((l) => { counts[l.status]++; });
    return [
      { label: 'Pending', value: counts.Pending, color: '#d97706' },
      { label: 'Approved', value: counts.Approved, color: '#16a34a' },
      { label: 'Rejected', value: counts.Rejected, color: '#dc2626' }
    ];
  }

  get departmentHeadcountChart(): BarDatum[] {
    const counts = new Map<string, number>();
    this.employees.forEach((e) => {
      const key = e.departmentName || 'Unassigned';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const palette = ['#3050e0', '#0891b2', '#16a34a', '#d97706', '#9d174d', '#5b21b6'];
    return Array.from(counts.entries()).map(([label, value], i) => ({ label, value, color: palette[i % palette.length] }));
  }

  get hrTeamTaskStatusChart(): BarDatum[] {
    const counts = { Pending: 0, InProgress: 0, Completed: 0 };
    this.hrTeamTasks.forEach((t) => { counts[t.status]++; });
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

  get overtimeRatePercent(): number {
    if (this.allAttendance.length === 0) return 0;
    return Math.round((this.countFlagged() / this.allAttendance.length) * 100);
  }

  employeesPage = 1;
employeesPageSize = 10;

get pagedEmployees(): EmployeeListItem[] {
  const start = (this.employeesPage - 1) * this.employeesPageSize;
  return this.employees.slice(start, start + this.employeesPageSize);
}

onEmployeesPageSizeChange(size: number): void {
  this.employeesPageSize = size;
  this.employeesPage = 1;
}

regularizationPrefillDate: string | null = null;

onRegularizeDate(dateIso: string): void {
  this.regularizationPrefillDate = dateIso;
  this.activeTab = 'regularization';
}
managersPage = 1;
managersPageSize = 10;

get pagedManagers(): ManagerOption[] {
  const start = (this.managersPage - 1) * this.managersPageSize;
  return this.managers.slice(start, start + this.managersPageSize);
}

onManagersPageSizeChange(size: number): void {
  this.managersPageSize = size;
  this.managersPage = 1;
}

departmentsPage = 1;
departmentsPageSize = 10;

get pagedDepartments(): Department[] {
  const start = (this.departmentsPage - 1) * this.departmentsPageSize;
  return this.departments.slice(start, start + this.departmentsPageSize);
}

onDepartmentsPageSizeChange(size: number): void {
  this.departmentsPageSize = size;
  this.departmentsPage = 1;
}
hrTeamPage = 1;
hrTeamPageSize = 10;

get pagedHrTeam(): HrTeamMember[] {
  const start = (this.hrTeamPage - 1) * this.hrTeamPageSize;
  return this.hrTeam.slice(start, start + this.hrTeamPageSize);
}

onHrTeamPageSizeChange(size: number): void {
  this.hrTeamPageSize = size;
  this.hrTeamPage = 1;
}
allLeavePage = 1;
allLeavePageSize = 10;

get pagedAllLeave(): LeaveRequestItem[] {
  const start = (this.allLeavePage - 1) * this.allLeavePageSize;
  return this.allLeave.slice(start, start + this.allLeavePageSize);
}

onAllLeavePageSizeChange(size: number): void {
  this.allLeavePageSize = size;
  this.allLeavePage = 1;
}
historyPage = 1;
historyPageSize = 10;
historyTotalCount = 0;
historyLogs: AttendanceLog[] = [];

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

passwordResetRequests: PasswordResetRequestItem[] = [];
passwordResetLoading = false;
passwordResetError = '';

showRejectResetModal = false;
rejectResetTargetId: number | null = null;
rejectResetReason = '';
rejectResetError = '';

resolvingResetId: number | null = null;
lastTemporaryPassword: { userName: string; password: string } | null = null;

loadPasswordResetRequests(): void {
  this.passwordResetLoading = true;
  this.hrService.getPasswordResetRequests().subscribe({
    next: (data) => { this.passwordResetRequests = data; this.passwordResetLoading = false; this.cdr.detectChanges(); },
    error: () => { this.passwordResetError = 'Failed to load password reset requests.'; this.passwordResetLoading = false; this.cdr.detectChanges(); }
  });
}

resetPassword(request: PasswordResetRequestItem): void {
  if (!confirm(`Reset the password for ${request.employeeName}? A new temporary password will be generated.`)) return;
  this.resolvingResetId = request.id;
  this.hrService.resolvePasswordReset(request.id, 'Reset').subscribe({
    next: (res) => {
      this.resolvingResetId = null;
      this.lastTemporaryPassword = { userName: request.employeeName || '', password: res.temporaryPassword || '' };
      this.loadPasswordResetRequests();
    },
    error: (err) => { this.resolvingResetId = null; this.passwordResetError = err.error || 'Failed to reset password.'; this.cdr.detectChanges(); }
  });
}

openRejectResetModal(request: PasswordResetRequestItem): void {
  this.rejectResetTargetId = request.id;
  this.rejectResetReason = '';
  this.rejectResetError = '';
  this.showRejectResetModal = true;
}

confirmRejectReset(): void {
  if (!this.rejectResetReason.trim()) {
    this.rejectResetError = 'A rejection reason is required.';
    return;
  }
  this.hrService.resolvePasswordReset(this.rejectResetTargetId!, 'Reject', this.rejectResetReason.trim()).subscribe({
    next: () => {
      this.showRejectResetModal = false;
      this.loadPasswordResetRequests();
    },
    error: (err) => { this.rejectResetError = err.error || 'Failed to reject request.'; this.cdr.detectChanges(); }
  });
}
}