# ComplianceOS

A full-stack enterprise compliance and workforce management platform — attendance tracking, leave management, task assignment, and hierarchy-based approval workflows, built with an ASP.NET Core backend and an Angular frontend.

## Features

- **Role-based access control** — Employee, Manager, HR Employee, and HR Manager roles, each with a dedicated dashboard and scoped permissions
- **Attendance tracking** — clock in/out, weekly hours visualization with overtime breakdown, paginated attendance history
- **Attendance Regularization** — employees can request corrections to missed clock-ins/outs; approvals route dynamically through the actual reporting hierarchy (not hardcoded roles), backed by SQL Server stored procedures with transactional approve/reject logic
- **Leave management** — leave requests by type (Medical, Casual, Annual, Unpaid, Other), with mandatory supporting-document upload for Medical Leave; attachments are access-controlled (owner, reporting manager, or HR only — never publicly reachable)
- **Task management** — managers assign and track tasks across their direct reports; employees manage their own task list
- **Organization hierarchy** — dynamic, self-referencing manager/employee tree, visualized in the HR dashboard
- **Account security** — JWT authentication, in-app Change Password, and an HR-mediated Forgot Password workflow (request → HR review → temporary password reset, with a full audit trail)
- **Pagination** — server-side pagination for high-growth data (attendance logs, regularization history) and client-side pagination elsewhere, with a consistent, reusable pagination UI throughout
- **Enterprise UI** — a shared design system (brass/gold accent theme), responsive dashboards, and reusable chart/table/modal components

## Tech Stack

**Backend**
- ASP.NET Core Web API (.NET)
- Entity Framework Core (Code-First migrations) + SQL Server
- Raw ADO.NET + stored procedures for the Attendance Regularization module specifically
- JWT Bearer authentication, BCrypt password hashing
- CORS locked to the Angular dev origin

**Frontend**
- Angular (standalone components, signals)
- RxJS + Angular `HttpClient`
- Role-based route guards and an auth interceptor for JWT attachment

## Project Structure

```
ComplianceOS/
├── ComplianceApi/              # ASP.NET Core backend
│   ├── Controllers/
│   ├── Models/
│   ├── DTOs/
│   ├── Data/                   # AppDbContext
│   ├── Services/
│   ├── Repositories/
│   ├── Migrations/
│   └── appsettings.json.example
├── frontend/
│   └── compliance-ui/          # Angular frontend
│       └── src/app/
│           ├── auth/
│           ├── employee-dashboard/
│           ├── manager-dashboard/
│           ├── hr-dashboard/
│           ├── attendance-regularization/
│           ├── leave/
│           └── shared/         # Reusable components: shell, modal, pagination, charts
└── ComplianceApi.slnx
```

## Getting Started

### Prerequisites

- [.NET SDK](https://dotnet.microsoft.com/download) (matching the version in `ComplianceApi.csproj`)
- [Node.js](https://nodejs.org/) and npm
- [Angular CLI](https://angular.dev/tools/cli) (`npm install -g @angular/cli`)
- SQL Server / SQL Server LocalDB
- Visual Studio (backend) and VS Code (frontend), or your editors of choice

### Backend Setup

1. Open `ComplianceApi.slnx` in Visual Studio.
2. Copy `ComplianceApi/appsettings.json.example` to `ComplianceApi/appsettings.json`, and fill in:
   - `ConnectionStrings:DefaultConnection` — your SQL Server / LocalDB connection string
   - `Jwt:Key` — a long, random secret (never reuse the example value)
3. Open **Tools → NuGet Package Manager → Package Manager Console** and run:
```powershell
   Update-Database
```
   This applies all migrations, including the stored procedures used by the Attendance Regularization module.
4. Run the project (F5). By default it's available at `https://localhost:7075`.

### Frontend Setup

```bash
cd frontend/compliance-ui
npm install
ng serve
```

The app will be available at `http://localhost:4200`.

> The frontend's API base URL is configured in `src/app/core/api-config.ts` — update it if your backend runs on a different port.

## Roles & Access

| Role | Access |
|---|---|
| **Employee** | Own attendance, tasks, leave, and regularization requests |
| **Manager** | Everything an Employee has, plus their direct reports' attendance, tasks, leave approvals, and regularization approvals |
| **HR Employee** | Org-wide read access: employee list, managers, departments, leave, password reset requests |
| **HR Manager** | Everything HR Employee has, plus write access: registering employees, role changes, account activation/deactivation, and resolving password reset requests |

Accounts are provisioned by HR — there is no public self-registration in the UI.

## Security Notes

- Passwords are hashed with BCrypt; plain-text passwords are never stored.
- The JWT carries no password/security-stamp claim, so changing a password does not invalidate the current session.
- Leave attachments are stored outside any publicly-served directory and are only ever returned through an authenticated, authorization-checked endpoint.
- CORS is restricted to the Angular dev origin, explicit HTTP methods, and explicit headers only.
