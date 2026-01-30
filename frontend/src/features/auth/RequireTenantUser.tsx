import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

import { useAppSelector } from "../../app/hooks";

export function RequireTenantUser({ children }: { children: ReactNode }) {
  const isPlatformAdmin = useAppSelector((s) => s.auth.isPlatformAdmin);
  if (isPlatformAdmin) {
    return <Navigate to="/saas-admin" replace />;
  }
  return children;
}

