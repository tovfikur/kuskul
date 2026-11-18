import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import { useAppSelector } from "../../app/hooks";



export function RequireTenantUser({ children }: { children: ReactNode }) {
  const isPlatformAdmin = useAppSelector((s: any) => s.auth.isPlatformAdmin);
  const roleName = useAppSelector((s: any) => s.auth.memberships[0]?.role_name);
  const location = useLocation();

  if (isPlatformAdmin) {
    return <Navigate to="/saas-admin" replace />;
  }

  const path = location.pathname;
  const isStudentPortal = path.startsWith("/student-portal");
  const isGuardianPortal = path.startsWith("/guardian-portal");
  const isTeacherPortal = path.startsWith("/teacher-portal");

  if (roleName === "student") {
    if (!isStudentPortal) {
      return <Navigate to="/student-portal" replace />;
    }
    return children;
  }

  if (roleName === "parent" || roleName === "guardian") {
    if (!isGuardianPortal) {
      return <Navigate to="/guardian-portal" replace />;
    }
    return children;
  }

  if (roleName === "teacher") {
    if (!isTeacherPortal) {
      return <Navigate to="/teacher-portal" replace />;
    }
    return children;
  }

  // Any other role (admin, teacher, staff, etc.)
  // They should not access student or guardian portal
  if (isStudentPortal || isGuardianPortal || isTeacherPortal) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

