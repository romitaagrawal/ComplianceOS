import { Routes } from '@angular/router';
import { roleGuard } from './auth/auth-guard';
import { LoginComponent } from './auth/login/login';
import { HrDashboard } from './hr-dashboard/hr-dashboard';
import { ManagerDashboard } from './manager-dashboard/manager-dashboard';
import { EmployeeDashboard } from './employee-dashboard/employee-dashboard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },

  {
    path: 'employee-dashboard',
    component: EmployeeDashboard,
    canActivate: [roleGuard(['Employee'])]
  },
  {
    path: 'manager-dashboard',
    component: ManagerDashboard,
    canActivate: [roleGuard(['Manager'])]
  },
  {
    path: 'hr-dashboard',
    component: HrDashboard,
    canActivate: [roleGuard(['HREmployee', 'HRManager'])]
  },

  { path: '**', redirectTo: 'login' }
];