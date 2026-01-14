import axios, { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'

import { store } from '../app/store'
import { setAccessToken, signOut } from '../features/auth/authSlice'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const state = store.getState()
  const token = state.auth.accessToken
  const schoolId = state.auth.activeSchoolId

  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }

  if (schoolId) {
    config.headers = config.headers ?? {}
    if (!config.headers['X-School-Id']) {
      config.headers['X-School-Id'] = schoolId
    }
  }

  return config
})

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const resp = await api.post('/auth/refresh')
  return resp.data.access_token as string
}

api.interceptors.response.use(
  (resp) => resp,
  async (error: AxiosError) => {
    const status = error.response?.status
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

    if (!original) {
      return Promise.reject(error)
    }

    if (status === 401 && !original._retry) {
      original._retry = true
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null
          })
        }
        const newToken = await refreshPromise
        store.dispatch(setAccessToken(newToken))
        original.headers = original.headers ?? {}
        original.headers.Authorization = `Bearer ${newToken}`
        return api.request(original)
      } catch (e) {
        store.dispatch(signOut())
        return Promise.reject(e)
      }
    }

    return Promise.reject(error)
  },
)
