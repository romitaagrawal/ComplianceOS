import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-config';

export interface AttendanceLog {
  id: number;
  clockIn: string;
  clockOut: string | null;
  totalHours: number | null;
  isOvertimeFlagged: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private apiUrl = `${API_BASE_URL}/Attendance`;

  constructor(private http: HttpClient) {}

  clockIn(): Observable<AttendanceLog> {
    return this.http.post<AttendanceLog>(`${this.apiUrl}/clock-in`, {});
  }

  clockOut(): Observable<AttendanceLog> {
    return this.http.post<AttendanceLog>(`${this.apiUrl}/clock-out`, {});
  }

  getMyLogs(): Observable<AttendanceLog[]> {
    return this.http.get<AttendanceLog[]>(`${this.apiUrl}/my-logs`);
  }

  getToday(): Observable<AttendanceLog | null> {
    return this.http.get<AttendanceLog | null>(`${this.apiUrl}/today`);
  }

  getMyLogsPaged(page: number, pageSize: number): Observable<import('../core/models').PagedResult<AttendanceLog>> {
  return this.http.get<import('../core/models').PagedResult<AttendanceLog>>(`${this.apiUrl}/my-logs`, {
    params: { page, pageSize }
  });
}
}