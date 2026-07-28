import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { api, initAppData } from '../api/client'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [financialYears, setFinancialYears] = useState([])
  const [activeYearId, setActiveYearId] = useState('')
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState(null)

  const notify = useCallback((message, type = 'success') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 3500)
  }, [])

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setConfirmState({ message, resolve })
    })
  }, [])

  const loadYears = useCallback(async () => {
    const years = await api.getFinancialYears()
    setFinancialYears(years)
    const active = years.find((year) => year.isActive) || years[0]
    if (active) setActiveYearId(active.id)
  }, [])

  useEffect(() => {
    initAppData()
      .then(() => loadYears())
      .catch((error) => notify(error.message, 'error'))
      .finally(() => setLoading(false))
  }, [loadYears, notify])

  const activeYear = useMemo(
    () => financialYears.find((year) => year.id === activeYearId) || null,
    [financialYears, activeYearId],
  )

  const value = {
    financialYears,
    activeYear,
    activeYearId,
    setActiveYearId,
    loadYears,
    loading,
    notify,
    confirm,
    toasts,
    confirmState,
    setConfirmState,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
