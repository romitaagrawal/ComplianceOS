import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-config';
import { AttendanceSummary, TeamStats } from '../core/models';

export interface TeamMember {
  id: number;
  displayId: string | null;
  fullName: string;
  email: string;
  role: string;
  lastLoginAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class ManagerService {
  private apiUrl = `${API_BASE_URL}/Manager`;

  constructor(private http: HttpClient) {}

  getMyTeam(): Observable<TeamMember[]> {
    return this.http.get<TeamMember[]>(`${this.apiUrl}/my-team`);
  }

  getTeamAttendance(): Observable<AttendanceSummary[]> {
    return this.http.get<AttendanceSummary[]>(`${this.apiUrl}/team-attendance`);
  }

  getTeamStats(): Observable<TeamStats> {
    return this.http.get<TeamStats>(`${this.apiUrl}/team-stats`);
  }

  getTeamAttendancePaged(page: number, pageSize: number): Observable<import('../core/models').PagedResult<AttendanceSummary>> {
  return this.http.get<import('../core/models').PagedResult<AttendanceSummary>>(`${this.apiUrl}/team-attendance`, {
    params: { page, pageSize }
  });
}
}