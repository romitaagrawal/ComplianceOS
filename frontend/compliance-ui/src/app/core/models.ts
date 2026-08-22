export type UserRole = 'Employee' | 'Manager' | 'HREmployee' | 'HRManager';
export type AccountStatus = 'Active' | 'Inactive';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'Pending' | 'InProgress' | 'Completed';

export interface UserSummary {
  id: number;
  displayId: string | null;
  fullName: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  managerId: number | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface EmployeeListItem {
  id: number;
  displayId: string | null;
  fullName: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  departmentName: string | null;
  managerName: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface ManagerOption {
  id: number;
  displayId: string | null;
  fullName: string;
  departmentName: string | null;
}

export interface HrTeamMember {
  id: number;
  displayId: string | null;
  fullName: string;
  email: string;
  accountStatus: AccountStatus;
  lastLoginAt: string | null;
}

export interface Department {
  id: number;
  name: string;
  description: string | null;
}

export interface OrgNode {
  id: number;
  displayId: string | null;
  fullName: string;
  role: UserRole;
  departmentName: string | null;
  children: OrgNode[];
}

export interface AttendanceSummary {
  id: number;
  userId?: number;
  employeeName?: string;
  clockIn: string;
  clockOut: string | null;
  totalHours: number | null;
  isOvertimeFlagged: boolean;
}

export interface LeaveRequestItem {
  id: number;
  userId: number;
  employeeName?: string;
  startDate: string;
  endDate: string;
  leaveType: LeaveType;
  status: LeaveStatus;
  reason: string | null;
  hasAttachment: boolean;
  attachmentFileName: string | null;
}

export interface TeamStats {
  directReports: number;
  totalTeamMembers: number;
}

export interface TaskItemDto {
  id: number;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string | null;
  createdAt: string;
  assignedToUserId?: number;
  assignedToName?: string;
  assignedByName?: string;
}

export interface TaskItemDto {
  id: number;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string | null;
  createdAt: string;
  assignedToUserId?: number;
  assignedToName?: string;
  assignedByUserId?: number;
  assignedByName?: string;
}

export type RegularizationReason =
  | 'Forgot to Clock In'
  | 'Forgot to Clock Out'
  | 'Missed Both Clock In & Clock Out'
  | 'Biometric/Clocking Device Failure'
  | 'Network/Application Issue'
  | 'Official Off-site Duty'
  | 'Client Visit'
  | 'Business Travel'
  | 'Work From Home Attendance Issue'
  | 'Other';

export type RegularizationStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface RegularizationRequest {
  id: number;
  attendanceLogId: number | null;
  userId: number;
  employeeName?: string;
  employeeDisplayId?: string | null;
  employeeRole?: string;
  attendanceDate: string;
  originalClockIn: string | null;
  originalClockOut: string | null;
  requestedClockIn: string;
  requestedClockOut: string;
  reason: RegularizationReason;
  otherReasonText: string | null;
  remarks: string | null;
  status: RegularizationStatus;
  rejectionReason: string | null;
  submittedAt: string;
  decidedAt: string | null;
  decidedByName: string | null;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export type LeaveType = 'Medical Leave' | 'Casual Leave' | 'Annual Leave' | 'Unpaid Leave' | 'Other';

export type PasswordResetStatus = 'Pending' | 'Reset' | 'Rejected';

export interface PasswordResetRequestItem {
  id: number;
  userId: number;
  employeeName?: string;
  employeeEmail?: string;
  employeeDisplayId?: string | null;
  status: PasswordResetStatus;
  rejectionReason: string | null;
  requestedAt: string;
  resolvedAt: string | null;
  resolvedByName: string | null;
}