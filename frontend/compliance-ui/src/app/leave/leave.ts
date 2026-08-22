import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-config';
import { LeaveRequestItem, LeaveType } from '../core/models';

export interface LeaveApplyPayload {
  startDate: string;
  endDate: string;
  leaveType: LeaveType;
  reason: string | null;
  attachment: File | null;
}

export const LEAVE_TYPES: LeaveType[] = ['Medical Leave', 'Casual Leave', 'Annual Leave', 'Unpaid Leave', 'Other'];

const TEXT_RESPONSE = { responseType: 'text' as const };

@Injectable({ providedIn: 'root' })
export class LeaveService {
  private apiUrl = `${API_BASE_URL}/Leave`;

  constructor(private http: HttpClient) {}

  // multipart/form-data now, since it may carry a file. Angular's HttpClient
  // sets the correct Content-Type + boundary automatically for FormData --
  // don't set Content-Type manually or the boundary will be missing.
  apply(payload: LeaveApplyPayload): Observable<string> {
    const formData = new FormData();
    formData.append('startDate', payload.startDate);
    formData.append('endDate', payload.endDate);
    formData.append('leaveType', payload.leaveType);
    if (payload.reason) formData.append('reason', payload.reason);
    if (payload.attachment) formData.append('attachment', payload.attachment, payload.attachment.name);
    return this.http.post(`${this.apiUrl}/apply`, formData, TEXT_RESPONSE);
  }

  getMyRequests(): Observable<LeaveRequestItem[]> {
    return this.http.get<LeaveRequestItem[]>(`${this.apiUrl}/my-requests`);
  }

  getTeamRequests(): Observable<LeaveRequestItem[]> {
    return this.http.get<LeaveRequestItem[]>(`${this.apiUrl}/team-requests`);
  }

  actOnRequest(id: number, action: 'Approve' | 'Reject'): Observable<string> {
    return this.http.put(`${this.apiUrl}/${id}/action`, { action }, TEXT_RESPONSE);
  }

  downloadAttachment(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/attachment`, { responseType: 'blob' });
  }
}