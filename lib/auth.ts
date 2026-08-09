'use client';
// lib/auth.ts — Role-based access control utilities

export type Role = 'OWNER' | 'MANAGER' | 'BILLER' | 'WORKER' | 'BILL';

export type Module = 
  | 'dashboard' | 'products' | 'inventory' | 'pos' | 'sales'
  | 'procurement' | 'suppliers' | 'transfers' | 'returns'
  | 'analytics' | 'ai' | 'reports' | 'sustainability'
  | 'staff' | 'settings' | 'scanner';

// Permission matrix — what each role can access
const PERMISSIONS: Record<Role, Set<Module>> = {
  OWNER: new Set(['dashboard','products','inventory','pos','sales','procurement','suppliers','transfers','returns','analytics','ai','reports','sustainability','staff','settings','scanner']),
  MANAGER: new Set(['dashboard','products','inventory','pos','sales','procurement','suppliers','transfers','returns','analytics','ai','reports','sustainability','scanner']),
  BILLER: new Set(['dashboard','pos','sales','products','returns','scanner']),
  WORKER: new Set(['scanner','inventory']),
  BILL: new Set(['scanner','inventory']),  // legacy alias
};

export function hasPermission(role: Role | string | undefined, module: Module): boolean {
  if (!role) return false;
  const perms = PERMISSIONS[role as Role];
  if (!perms) return false;
  return perms.has(module);
}

export function getDefaultRoute(role: Role | string | undefined): string {
  switch(role) {
    case 'WORKER':
    case 'BILL': return '/dashboard/scanner';
    case 'BILLER': return '/dashboard/pos';
    case 'MANAGER':
    case 'OWNER': return '/dashboard';
    default: return '/dashboard';
  }
}
