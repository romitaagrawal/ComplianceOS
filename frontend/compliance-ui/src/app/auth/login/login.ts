import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../auth';
import { PasswordResetRequestItem } from '../../core/models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  mode: 'login' | 'forgot' = 'login';

  email: string = '';
  password: string = '';
  errorMessage: string = '';

  forgotEmail = '';
  forgotError = '';
  forgotSuccess = '';
  forgotSubmitting = false;
  checkingStatus = false;
  forgotStatus: PasswordResetRequestItem | null = null;

  constructor(private authService: AuthService, private router: Router, private cdr: ChangeDetectorRef) {}

  onSubmit(): void {
    this.errorMessage = '';

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        const role = this.authService.getRole();

        switch (role) {
          case 'Employee':
            this.router.navigate(['/employee-dashboard']);
            break;
          case 'Manager':
            this.router.navigate(['/manager-dashboard']);
            break;
          case 'HREmployee':
          case 'HRManager':
            this.router.navigate(['/hr-dashboard']);
            break;
          default:
            this.authService.logout();
            this.errorMessage = 'Your account has an invalid role.';
            break;
        }
      },
      error: () => {
        this.errorMessage = 'Invalid email or password.';
      }
    });
  }

  showForgotPassword(): void {
    this.mode = 'forgot';
    this.forgotEmail = this.email;
    this.forgotError = '';
    this.forgotSuccess = '';
    this.forgotStatus = null;
  }

  backToLogin(): void {
    this.mode = 'login';
  }

  submitForgotPassword(): void {
    this.forgotError = '';
    this.forgotSuccess = '';

    if (!this.forgotEmail) {
      this.forgotError = 'Please enter your account email.';
      return;
    }

    this.forgotSubmitting = true;
    this.authService.forgotPassword(this.forgotEmail).subscribe({
      next: (message) => {
        this.forgotSubmitting = false;
        this.forgotSuccess = message;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.forgotSubmitting = false;
        this.forgotError = err.error || 'Failed to submit request.';
        this.cdr.detectChanges();
      }
    });
  }

  checkStatus(): void {
    this.forgotError = '';
    if (!this.forgotEmail) {
      this.forgotError = 'Please enter your account email.';
      return;
    }

    this.checkingStatus = true;
    this.authService.checkForgotPasswordStatus(this.forgotEmail).subscribe({
      next: (status) => {
        this.checkingStatus = false;
        this.forgotStatus = status;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.checkingStatus = false;
        this.forgotStatus = null;
        this.forgotError = err.error || 'No request found for this email.';
        this.cdr.detectChanges();
      }
    });
  }
}