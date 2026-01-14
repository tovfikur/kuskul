import './App.css'
import { Link, Route, Routes } from 'react-router-dom'

import { useAppDispatch, useAppSelector } from './app/hooks'
import { LoginPage } from './features/auth/LoginPage'
import { RequireAuth } from './features/auth/RequireAuth'
import { setActiveSchoolId, signOut } from './features/auth/authSlice'
import { UsersPage } from './features/users/UsersPage'

function Dashboard() {
  const dispatch = useAppDispatch()
  const email = useAppSelector((s) => s.auth.email)
  const memberships = useAppSelector((s) => s.auth.memberships)
  const activeSchoolId = useAppSelector((s) => s.auth.activeSchoolId)

  return (
    <div style={{ padding: 16 }}>
      <header style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <strong>{email}</strong>
        <select
          value={activeSchoolId ?? ''}
          onChange={(e) => dispatch(setActiveSchoolId(e.target.value || null))}
        >
          {memberships.map((m) => (
            <option key={m.school_id} value={m.school_id}>
              {m.school_id}
            </option>
          ))}
        </select>
        <nav style={{ display: 'flex', gap: 12 }}>
          <Link to="/">Home</Link>
          <Link to="/users">Users</Link>
        </nav>
        <button style={{ marginLeft: 'auto' }} onClick={() => dispatch(signOut())}>
          Sign out
        </button>
      </header>

      <main style={{ marginTop: 24 }}>
        <h1>Dashboard</h1>
        <div>Active school: {activeSchoolId ?? 'none'}</div>
      </main>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/users"
        element={
          <RequireAuth>
            <UsersPage />
          </RequireAuth>
        }
      />
    </Routes>
  )
}

export default App
