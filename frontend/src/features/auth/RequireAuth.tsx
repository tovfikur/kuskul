import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'

import { useAppSelector } from '../../app/hooks'

export function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAppSelector((s) => s.auth.accessToken)
  if (!token) return <Navigate to="/login" replace />
  return children
}
