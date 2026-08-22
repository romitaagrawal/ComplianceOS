import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-config';
import { RegularizationRequest, RegularizationReason } from '../core/models';

export interface RegularizationSubmitPayload {
  attendanceDate: string;
  reason: RegularizationReason;
  otherReasonText: string | null;
  requestedClockIn: string;
  requestedClockOut: string;
  remarks: string | null;
}

const TEXT_RESPONSE = { responseType: 'text' as const };

export const REGULARIZATION_REASONS: RegularizationReason[] = [
  'Forgot to Clock In',
  'Forgot to Clock Out',
  'Missed Both Clock In & Clock Out',
  'Biometric/Clocking Device Failure',
  'Network/Application Issue',
  'Official Off-site Duty',
  'Client Visit',
  'Business Travel',
  'Work From Home Attendance Issue',
  'Other'
];

@Injectable({ providedIn: 'root' })
export class RegularizationService {
  private apiUrl = `${API_BASE_URL}/AttendanceRegularization`;

  constructor(private http: HttpClient) {}

  submit(payload: RegularizationSubmitPayload): Observable<{ message: string; id: number }> {
    return this.http.post<{ message: string; id: number }>(this.apiUrl, payload);
  }

  getMyHistory(page: number, pageSize: number): Observable<import('../core/models').PagedResult<RegularizationRequest>> {
  return this.http.get<import('../core/models').PagedResult<RegularizationRequest>>(`${this.apiUrl}/my-history`, {
    params: { page, pageSize }
  });
}

  getPendingApprovals(): Observable<RegularizationRequest[]> {
    return this.http.get<RegularizationRequest[]>(`${this.apiUrl}/pending-approvals`);
  }

  approve(id: number): Observable<string> {
    return this.http.put(`${this.apiUrl}/${id}/approve`, {}, TEXT_RESPONSE);
  }

  reject(id: number, rejectionReason: string): Observable<string> {
    return this.http.put(`${this.apiUrl}/${id}/reject`, { rejectionReason }, TEXT_RESPONSE);
  }

  cancel(id: number): Observable<string> {
    return this.http.put(`${this.apiUrl}/${id}/cancel`, {}, TEXT_RESPONSE);
  }
}