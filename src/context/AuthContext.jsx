import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const AUTH_CONFIG_KEY = 'vs-auth-config'
const AUTH_SESSION_KEY = 'vs-auth-session'

const AuthContext = createContext(null)

async function hashPassword(password) {
  const data = new TextEncoder().encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function readConfig() {
  try {
    const raw = localStorage.getItem(AUTH_CONFIG_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function readSession() {
  try {
    return localStorage.getItem(AUTH_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [config, setConfig] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    setConfig(readConfig())
    setIsAuthenticated(readSession())
    setReady(true)
  }, [])

  const needsSetup = !config?.username || !config?.passwordHash

  const setupAccount = useCallback(async ({ username, password }) => {
    const trimmedUser = username.trim()
    if (!trimmedUser || password.length < 4) {
      throw new Error('Username required and password must be at least 4 characters')
    }

    const nextConfig = {
      username: trimmedUser,
      passwordHash: await hashPassword(password),
    }

    localStorage.setItem(AUTH_CONFIG_KEY, JSON.stringify(nextConfig))
    localStorage.setItem(AUTH_SESSION_KEY, '1')
    setConfig(nextConfig)
    setIsAuthenticated(true)
  }, [])

  const login = useCallback(async ({ username, password }) => {
    const current = readConfig()
    if (!current?.passwordHash) {
      throw new Error('Login not set up yet')
    }

    const passwordHash = await hashPassword(password)
    if (username.trim() !== current.username || passwordHash !== current.passwordHash) {
      throw new Error('Wrong username or password')
    }

    localStorage.setItem(AUTH_SESSION_KEY, '1')
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_SESSION_KEY)
    setIsAuthenticated(false)
  }, [])

  const value = useMemo(
    () => ({
      ready,
      isAuthenticated,
      needsSetup,
      username: config?.username || '',
      setupAccount,
      login,
      logout,
    }),
    [ready, isAuthenticated, needsSetup, config, setupAccount, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
