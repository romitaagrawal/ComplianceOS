import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-config';
import { Department } from '../core/models';

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private apiUrl = `${API_BASE_URL}/Department`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Department[]> {
    return this.http.get<Department[]>(this.apiUrl);
  }

  // HR Manager only
  create(name: string, description: string | null): Observable<Department> {
    return this.http.post<Department>(this.apiUrl, { name, description });
  }
}