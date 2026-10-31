// lib/rbac.ts

export type UserRole = 'admin' | 'procurement' | 'storekeeper' | 'engineer';

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['*'], // Full control to all routes
  procurement: ['dashboard', 'lpo', 'inventory', 'suppliers'],
  storekeeper: ['dashboard', 'requests', 'inventory', 'goods-receipts'],
  engineer: ['dashboard', 'requests', 'inventory', 'goods-receipts', 'aluminum'],
};

export function hasPageAccess(role: string, pathname: string): boolean {
  if (role === 'admin' || !role) return true; // Default admin / unrestricted fallback
  
  const allowedSections = ROLE_PERMISSIONS[role as UserRole] || [];
  if (allowedSections.includes('*')) return true;
  
  // Check if the current pathname matches any allowed section
  return allowedSections.some((section) => pathname.includes(section));
}