import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { API_BASE_URL } from '../core/api-config';
import { PasswordResetRequestItem } from '../core/models';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

interface DecodedToken {
  role?: string;
  nameid?: string;
  email?: string;
  exp?: number;
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?: string;
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'?: string;
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = `${API_BASE_URL}/Auth`;

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          // Save token immediately after successful login
          this.saveToken(response.token);
        })
      );
  }

  saveToken(token: string): void {
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  logout(): void {
    localStorage.removeItem('token');
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    try {
      const decoded: DecodedToken = jwtDecode<DecodedToken>(token);

      if (!decoded.exp) {
        return false;
      }

      const currentTime = Math.floor(Date.now() / 1000);

      if (decoded.exp <= currentTime) {
        this.logout();
        return false;
      }

      return true;
    } catch {
      this.logout();
      return false;
    }
  }

  getRole(): string | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const decoded = jwtDecode<DecodedToken>(token);

      if (decoded.role) {
        return decoded.role;
      }

      const fullRoleClaim =
        decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

      return fullRoleClaim ?? null;
    } catch {
      return null;
    }
  }

  getUserId(): number | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const decoded = jwtDecode<DecodedToken>(token);

      const id =
        decoded.nameid ??
        decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];

      if (!id) {
        return null;
      }

      return Number(id);
    } catch {
      return null;
    }
  }

  changePassword(currentPassword: string, newPassword: string, confirmNewPassword: string): Observable<string> {
  return this.http.post(
    `${this.apiUrl}/change-password`,
    { currentPassword, newPassword, confirmNewPassword },
    { responseType: 'text' }
  );
}

forgotPassword(email: string): Observable<string> {
  return this.http.post(`${this.apiUrl}/forgot-password`, { email }, { responseType: 'text' });
}

checkForgotPasswordStatus(email: string): Observable<PasswordResetRequestItem> {
  return this.http.get<PasswordResetRequestItem>(`${this.apiUrl}/forgot-password/status`, { params: { email } });
}
}