'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Module } from '@/lib/auth';
import { hasPermission } from '@/lib/auth';

// Get current user from localStorage (stored by api-client)
function getCurrentRole(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem('Green Quant_auth');
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return parsed?.user?.role;
  } catch { return undefined; }
}

interface RoleGateProps {
  module: Module;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function RoleGate({ module, children, fallback }: RoleGateProps) {
  const [role, setRole] = useState<string | undefined>(undefined);
  const [checked, setChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const r = getCurrentRole();
    setRole(r);
    setChecked(true);
    if (!hasPermission(r, module)) {
      router.replace('/dashboard');
    }
  }, [module, router]);

  if (!checked) return null;
  if (!hasPermission(role, module)) return fallback ?? null;
  return <>{children}</>;
}
