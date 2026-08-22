import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-config';
import {
  UserSummary,
  AttendanceSummary,
  LeaveRequestItem,
  EmployeeListItem,
  ManagerOption,
  HrTeamMember,
  OrgNode,
  UserRole,
  AccountStatus
} from '../core/models';
import { PasswordResetRequestItem } from '../core/models';

export interface RegisterEmployeePayload {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  managerId: number | null;
  departmentId: number | null;
}

const TEXT_RESPONSE = { responseType: 'text' as const };

@Injectable({ providedIn: 'root' })
export class HrService {
  private apiUrl = `${API_BASE_URL}/Hr`;

  constructor(private http: HttpClient) {}

  // Org-wide read-only overview (both HR roles can view)
  getAllUsers(): Observable<UserSummary[]> {
    return this.http.get<UserSummary[]>(`${this.apiUrl}/all-users`);
  }

  getAllAttendance(): Observable<AttendanceSummary[]> {
    return this.http.get<AttendanceSummary[]>(`${this.apiUrl}/all-attendance`);
  }

  getAllLeaveRequests(): Observable<LeaveRequestItem[]> {
    return this.http.get<LeaveRequestItem[]>(`${this.apiUrl}/all-leave-requests`);
  }

  // HR Manager only
  getEmployeeList(): Observable<EmployeeListItem[]> {
    return this.http.get<EmployeeListItem[]>(`${this.apiUrl}/employees`);
  }

  getManagers(): Observable<ManagerOption[]> {
    return this.http.get<ManagerOption[]>(`${this.apiUrl}/managers`);
  }

  getMyHrTeam(): Observable<HrTeamMember[]> {
    return this.http.get<HrTeamMember[]>(`${this.apiUrl}/my-hr-team`);
  }

  registerEmployee(payload: RegisterEmployeePayload): Observable<{ id: number; displayId: string; fullName: string; role: string }> {
    return this.http.post<{ id: number; displayId: string; fullName: string; role: string }>(
      `${this.apiUrl}/register-employee`,
      payload
    );
  }

  changeRole(userId: number, role: UserRole): Observable<string> {
    return this.http.put(`${this.apiUrl}/users/${userId}/role`, { role }, TEXT_RESPONSE);
  }

  // Backend binds [FromBody] string — body must be a raw JSON string literal.
  setStatus(userId: number, status: AccountStatus): Observable<string> {
    return this.http.put(
      `${this.apiUrl}/users/${userId}/status`,
      JSON.stringify(status),
      { ...TEXT_RESPONSE, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Shared by both HR roles (dynamic, database-driven org chart)
  getHierarchy(): Observable<OrgNode[]> {
    return this.http.get<OrgNode[]>(`${this.apiUrl}/hierarchy`);
  }

  getPasswordResetRequests(): Observable<PasswordResetRequestItem[]> {
  return this.http.get<PasswordResetRequestItem[]>(`${this.apiUrl}/password-reset-requests`);
}

resolvePasswordReset(id: number, action: 'Reset' | 'Reject', rejectionReason?: string): Observable<{ message: string; temporaryPassword: string | null }> {
  return this.http.put<{ message: string; temporaryPassword: string | null }>(
    `${this.apiUrl}/password-reset-requests/${id}/resolve`,
    { action, rejectionReason }
  );
}
}