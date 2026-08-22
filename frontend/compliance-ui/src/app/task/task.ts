import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-config';
import { TaskItemDto, TaskPriority, TaskStatus } from '../core/models';

export interface TaskCreatePayload {
  title: string;
  description: string | null;
  priority: TaskPriority;
  deadline: string | null;
  assignedToUserId: number;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private apiUrl = `${API_BASE_URL}/Task`;

  constructor(private http: HttpClient) {}

  // Manager/HR Manager assigning to a direct report, or to themselves
  assignTask(payload: TaskCreatePayload): Observable<TaskItemDto> {
    return this.http.post<TaskItemDto>(this.apiUrl, payload);
  }

  getMyTasks(): Observable<TaskItemDto[]> {
    return this.http.get<TaskItemDto[]>(`${this.apiUrl}/my-tasks`);
  }

  getTeamTasks(): Observable<TaskItemDto[]> {
    return this.http.get<TaskItemDto[]>(`${this.apiUrl}/team-tasks`);
  }

  updateStatus(id: number, status: TaskStatus): Observable<TaskItemDto> {
    return this.http.put<TaskItemDto>(`${this.apiUrl}/${id}/status`, { status });
  }

  // Edit/delete are only valid for a task you created for yourself —
  // the backend enforces that; these just call the endpoints.
  updateTask(id: number, payload: TaskCreatePayload): Observable<TaskItemDto> {
    return this.http.put<TaskItemDto>(`${this.apiUrl}/${id}`, payload);
  }

  deleteTask(id: number): Observable<string> {
    return this.http.delete(`${this.apiUrl}/${id}`, { responseType: 'text' });
  }
}