import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

import { useAppSelector } from "../../app/hooks";

export function RequirePlatformAdmin({ children }: { children: ReactNode }) {
  const isPlatformAdmin = useAppSelector((s) => s.auth.isPlatformAdmin);
  if (!isPlatformAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
