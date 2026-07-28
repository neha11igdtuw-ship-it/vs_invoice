import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { needsSetup, setupAccount, login } = useAuth()
  const [username, setUsername] = useState('Veerpal Singh')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      if (needsSetup) {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match')
        }
        await setupAccount({ username, password })
      } else {
        await login({ username, password })
      }
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <span className="mobile-app-mark">VS</span>
          <div>
            <h1>VS Invoice</h1>
            <p>Fruit Commission — Azadpur, Delhi</p>
          </div>
        </div>

        <h2>{needsSetup ? 'Set up login' : 'Sign in'}</h2>
        <p className="login-subtitle">
          {needsSetup
            ? 'Create your username and password for this phone or computer.'
            : 'Enter your username and password to open the app.'}
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={needsSetup ? 'new-password' : 'current-password'}
              minLength={4}
              required
            />
          </label>

          {needsSetup && (
            <label>
              <span>Confirm password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={4}
                required
              />
            </label>
          )}

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>
            {submitting ? 'Please wait...' : needsSetup ? 'Create login' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
