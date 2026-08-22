import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-config';

export interface MyProfile {
  id: number;
  fullName: string;
  email: string;
  role: string;
  accountStatus: string;
  createdAt: string;
  departmentName: string | null;
}

export interface ManagerInfo {
  id: number;
  fullName: string;
  email: string;
  role: string;
  departmentName: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = `${API_BASE_URL}/Profile`;

  constructor(private http: HttpClient) {}

  getMe(): Observable<MyProfile> {
    return this.http.get<MyProfile>(`${this.apiUrl}/me`);
  }

  getMyManager(): Observable<ManagerInfo | null> {
    return this.http.get<ManagerInfo | null>(`${this.apiUrl}/my-manager`);
  }
}