import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import { useAppSelector } from "../../app/hooks";

export function RequireTeacherUser({ children }: { children: ReactNode }) {
  const isPlatformAdmin = useAppSelector((s) => s.auth.isPlatformAdmin);
  const roleName = useAppSelector((s) => s.auth.memberships[0]?.role_name);
  const location = useLocation();

  if (isPlatformAdmin) {
    return <Navigate to="/saas-admin" replace />;
  }

  if (roleName !== "teacher") {
    return <Navigate to="/dashboard" replace state={{ from: location }} />;
  }

  return children;
}
