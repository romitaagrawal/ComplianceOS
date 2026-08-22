import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  @Input() title = 'Compliance System';

  constructor(private authService: AuthService, private router: Router) {}

  get role(): string | null {
    return this.authService.getRole();
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}