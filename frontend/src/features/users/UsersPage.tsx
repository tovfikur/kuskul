import { useEffect, useState } from 'react'

import { api } from '../../api/http'

type UserOut = { id: string; email: string; is_active: boolean }
type UserList = { items: UserOut[] }

export function UsersPage() {
  const [items, setItems] = useState<UserOut[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const resp = await api.get<UserList>('/users')
        if (!cancelled) setItems(resp.data.items)
      } catch {
        if (!cancelled) setError('Failed to load users')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div style={{ padding: 16 }}>
      <h2>Users</h2>
      {loading ? <div>Loading…</div> : null}
      {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}
      <ul>
        {items.map((u) => (
          <li key={u.id}>
            {u.email} {u.is_active ? '' : '(inactive)'}
          </li>
        ))}
      </ul>
    </div>
  )
}

