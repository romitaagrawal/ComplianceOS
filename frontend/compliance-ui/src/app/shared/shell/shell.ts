// import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { Router } from '@angular/router';
// import { AuthService } from '../../auth/auth';

// export interface NavItem {
//   key: string;
//   label: string;
//   icon: string;
//   badge?: number;
// }

// @Component({
//   selector: 'app-shell',
//   standalone: true,
//   imports: [CommonModule],
//   templateUrl: './shell.html',
//   styleUrl: './shell.css'
// })
// export class Shell {
//   @Input() title = '';
//   @Input() subtitle = '';
//   @Input() brandLabel = 'Compliance';
//   @Input() brandAccent = 'OS';
//   @Input() navItems: NavItem[] = [];
//   @Input() activeKey = '';
//   @Input() userName = '';
//   @Output() navSelect = new EventEmitter<string>();

//   collapsed = signal(false);

//   constructor(private authService: AuthService, private router: Router) {}

//   get role(): string | null {
//     return this.authService.getRole();
//   }

//   get initials(): string {
//     if (this.userName) {
//       const parts = this.userName.trim().split(/\s+/);
//       return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
//     }
//     return (this.role || 'U').substring(0, 2).toUpperCase();
//   }

//   toggleCollapse(): void {
//     this.collapsed.update((v) => !v);
//   }

//   onNavClick(key: string): void {
//     this.navSelect.emit(key);
//   }

//   onLogout(): void {
//     this.authService.logout();
//     this.router.navigate(['/login']);
//   }
// }

import { Component, Input, Output, EventEmitter, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth';
import { Modal } from '../modal/modal';

export interface NavItem {
  key: string;
  label: string;
  icon: string;
  badge?: number;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal],
  templateUrl: './shell.html',
  styleUrl: './shell.css'
})
export class Shell {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() brandLabel = 'Compliance';
  @Input() brandAccent = 'OS';
  @Input() navItems: NavItem[] = [];
  @Input() activeKey = '';
  @Input() userName = '';
  @Output() navSelect = new EventEmitter<string>();

  collapsed = signal(false);

  showChangePasswordModal = false;
  changePasswordForm = { currentPassword: '', newPassword: '', confirmNewPassword: '' };
  changePasswordError = '';
  changePasswordSuccess = '';
  changingPassword = false;

constructor(
  private authService: AuthService,
  private router: Router,
  private cdr: ChangeDetectorRef
) {}
  get role(): string | null {
    return this.authService.getRole();
  }

  get initials(): string {
    if (this.userName) {
      const parts = this.userName.trim().split(/\s+/);
      return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
    }
    return (this.role || 'U').substring(0, 2).toUpperCase();
  }

  toggleCollapse(): void {
    this.collapsed.update((v) => !v);
  }

  onNavClick(key: string): void {
    this.navSelect.emit(key);
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  openChangePasswordModal(): void {
    this.changePasswordForm = { currentPassword: '', newPassword: '', confirmNewPassword: '' };
    this.changePasswordError = '';
    this.changePasswordSuccess = '';
    this.showChangePasswordModal = true;
  }

  submitChangePassword(): void {
  this.changePasswordError = '';
  this.changePasswordSuccess = '';

  const { currentPassword, newPassword, confirmNewPassword } = this.changePasswordForm;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    this.changePasswordError = 'Please fill in all three fields.';
    return;
  }
  if (newPassword !== confirmNewPassword) {
    this.changePasswordError = 'New password and confirmation do not match.';
    return;
  }
  if (newPassword.length < 6) {
    this.changePasswordError = 'New password must be at least 6 characters long.';
    return;
  }

  this.changingPassword = true;
  this.authService.changePassword(currentPassword, newPassword, confirmNewPassword).subscribe({
    next: () => {
      this.changingPassword = false;
      this.changePasswordSuccess = 'Password changed successfully.';
      this.cdr.detectChanges();

      setTimeout(() => {
        this.showChangePasswordModal = false;
        this.changePasswordForm = { currentPassword: '', newPassword: '', confirmNewPassword: '' };
        this.changePasswordSuccess = '';
        this.cdr.detectChanges();
      }, 1200);
    },
    error: (err) => {
      this.changingPassword = false;
      this.changePasswordError = err.error || 'Failed to change password.';
      this.cdr.detectChanges();
    }
  });
}
}