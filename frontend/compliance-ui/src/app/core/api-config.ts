// Single source of truth for the API base URL.
//
// Previously this string (https://localhost:7075/api/...) was hardcoded
// separately inside auth.ts, attendance.ts, profile.ts, hr.ts, and manager.ts.
// Changing hosts (e.g. deploying to a real server) meant editing 5 files
// and risking missing one. Every service now imports API_BASE_URL from here.
//
// NOTE: if/when this project gets Angular's environment.ts / environment.prod.ts
// files wired up in angular.json (fileReplacements), swap the line below for:
//   import { environment } from '../../environments/environment';
//   export const API_BASE_URL = environment.apiUrl;
// That gives you per-build-configuration values instead of one hardcoded string.
export const API_BASE_URL = 'https://localhost:7075/api';