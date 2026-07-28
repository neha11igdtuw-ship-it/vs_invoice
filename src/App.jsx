import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import DashboardLayout from './layout/DashboardLayout'
import LoginPage from './pages/LoginPage'
import { LoadingState } from './components/ui'
import {
  arrivalConfig,
  dayBookConfig,
  ledgerConfig,
  redBookConfig,
} from './pages/moduleConfigs'
import './App.css'

const DashboardHome = lazy(() => import('./pages/DashboardHome'))
const InvoiceListPage = lazy(() => import('./pages/InvoiceListPage'))
const InvoiceEditorPage = lazy(() => import('./pages/InvoiceEditorPage'))
const SimpleModulePage = lazy(() => import('./pages/SimpleModulePage'))
const TeepPage = lazy(() => import('./pages/TeepPage'))
const FinancialYearsPage = lazy(() => import('./pages/FinancialYearsPage'))

function PageFallback({ message = 'Loading...' }) {
  return <LoadingState message={message} />
}

function ProtectedRoutes() {
  const { ready, isAuthenticated } = useAuth()

  if (!ready) return <PageFallback message="Starting app..." />

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route
          index
          element={
            <Suspense fallback={<PageFallback />}>
              <DashboardHome />
            </Suspense>
          }
        />
        <Route
          path="invoice"
          element={
            <Suspense fallback={<PageFallback />}>
              <InvoiceListPage />
            </Suspense>
          }
        />
        <Route
          path="invoice/new"
          element={
            <Suspense fallback={<PageFallback message="Opening invoice form..." />}>
              <InvoiceEditorPage mode="create" />
            </Suspense>
          }
        />
        <Route
          path="invoice/:id"
          element={
            <Suspense fallback={<PageFallback />}>
              <InvoiceEditorPage mode="view" />
            </Suspense>
          }
        />
        <Route
          path="invoice/:id/edit"
          element={
            <Suspense fallback={<PageFallback />}>
              <InvoiceEditorPage mode="edit" />
            </Suspense>
          }
        />
        <Route
          path="red-book"
          element={
            <Suspense fallback={<PageFallback />}>
              <SimpleModulePage config={redBookConfig} />
            </Suspense>
          }
        />
        <Route
          path="ledger"
          element={
            <Suspense fallback={<PageFallback />}>
              <SimpleModulePage config={ledgerConfig} />
            </Suspense>
          }
        />
        <Route
          path="day-book"
          element={
            <Suspense fallback={<PageFallback />}>
              <SimpleModulePage config={dayBookConfig} />
            </Suspense>
          }
        />
        <Route
          path="arrival"
          element={
            <Suspense fallback={<PageFallback />}>
              <SimpleModulePage config={arrivalConfig} />
            </Suspense>
          }
        />
        <Route
          path="teep"
          element={
            <Suspense fallback={<PageFallback />}>
              <TeepPage />
            </Suspense>
          }
        />
        <Route
          path="financial-years"
          element={
            <Suspense fallback={<PageFallback />}>
              <FinancialYearsPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <ProtectedRoutes />
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  )
}
