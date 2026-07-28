import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { ConfirmDialog, ToastStack } from '../components/ui'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/invoice', label: 'Invoice' },
  { to: '/red-book', label: 'Red Book' },
  { to: '/ledger', label: 'Ledger' },
  { to: '/day-book', label: 'Day Book' },
  { to: '/arrival', label: 'Arrival' },
  { to: '/teep', label: 'TEEP' },
  { to: '/financial-years', label: 'Financial Years' },
]

const MOBILE_MODULES = [
  { to: '/invoice', label: 'Invoice', hint: 'Commission bills' },
  { to: '/red-book', label: 'Red Book', hint: 'Daily records' },
  { to: '/ledger', label: 'Ledger', hint: 'Party accounts' },
  { to: '/day-book', label: 'Day Book', hint: 'Cash book' },
  { to: '/arrival', label: 'Arrival', hint: 'Stock arrivals' },
  { to: '/teep', label: 'TEEP', hint: 'Sales bills' },
]

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/invoice': 'Invoices',
  '/invoice/new': 'New Invoice',
  '/red-book': 'Red Book',
  '/ledger': 'Ledger',
  '/day-book': 'Day Book',
  '/arrival': 'Arrival',
  '/teep': 'TEEP',
  '/financial-years': 'Financial Years',
}

function getPageTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.startsWith('/invoice/') && pathname.endsWith('/edit')) return 'Edit Invoice'
  if (pathname.startsWith('/invoice/')) return 'Invoice'
  return 'VS Invoice'
}

function MobileMenu({ open, onClose, financialYears, activeYearId, setActiveYearId, isNative, onLogout, username }) {
  if (!open) return null

  return (
    <div className="mobile-menu-backdrop" onClick={onClose}>
      <div className="mobile-menu-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="mobile-menu-header">
          <strong>Settings &amp; Modules</strong>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <label className="mobile-menu-field">
          <span>Financial Year</span>
          <select value={activeYearId} onChange={(event) => setActiveYearId(event.target.value)}>
            {financialYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name} {year.isActive ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </label>

        {isNative && <p className="offline-badge mobile-menu-offline">Offline — data saved on this phone</p>}

        {username && <p className="mobile-menu-user">Signed in as {username}</p>}

        <nav className="mobile-menu-links">
          {MOBILE_MODULES.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={onClose}>
              <span>{item.label}</span>
              <small>{item.hint}</small>
            </NavLink>
          ))}
          <NavLink to="/financial-years" onClick={onClose}>
            <span>Financial Years</span>
            <small>Manage years</small>
          </NavLink>
          <button type="button" className="mobile-logout-btn" onClick={onLogout}>
            <span>Log out</span>
            <small>Sign out of this device</small>
          </button>
        </nav>
      </div>
    </div>
  )
}

function MobileShell({ children, pageTitle, showBack, onBack, onOpenMenu }) {
  return (
    <div className="mobile-shell">
      <header className="mobile-topbar">
        <div className="mobile-topbar-start">
          {showBack ? (
            <button type="button" className="icon-btn" onClick={onBack} aria-label="Go back">
              ←
            </button>
          ) : (
            <span className="mobile-app-mark">VS</span>
          )}
        </div>
        <h1 className="mobile-topbar-title">{pageTitle}</h1>
        <button type="button" className="icon-btn menu-dots" onClick={onOpenMenu} aria-label="Menu">
          ⋮
        </button>
      </header>

      <main className="mobile-content">{children}</main>

      <nav className="mobile-bottom-nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Home
        </NavLink>
        <NavLink to="/invoice" className={({ isActive }) => (isActive ? 'active' : '')}>
          Invoice
        </NavLink>
        <button type="button" onClick={onOpenMenu}>
          More
        </button>
      </nav>
    </div>
  )
}

export default function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isNative = Capacitor.isNativePlatform()
  const [menuOpen, setMenuOpen] = useState(false)
  const {
    financialYears,
    activeYearId,
    setActiveYearId,
    toasts,
    confirmState,
    setConfirmState,
  } = useApp()
  const { logout, username } = useAuth()

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
  }

  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname])
  const showBack = location.pathname !== '/'

  const sharedOverlays = (
    <>
      <ToastStack toasts={toasts} />
      <ConfirmDialog
        state={confirmState}
        onClose={(result) => {
          confirmState?.resolve(result)
          setConfirmState(null)
        }}
      />
      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        financialYears={financialYears}
        activeYearId={activeYearId}
        setActiveYearId={setActiveYearId}
        isNative={isNative}
        onLogout={handleLogout}
        username={username}
      />
    </>
  )

  if (isNative) {
    return (
      <>
        <MobileShell
          pageTitle={pageTitle}
          showBack={showBack}
          onBack={() => navigate(-1)}
          onOpenMenu={() => setMenuOpen(true)}
        >
          <Outlet />
        </MobileShell>
        {sharedOverlays}
      </>
    )
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <strong>VS Invoice</strong>
          <span>Fruit Commission</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {item.label}
            </NavLink>
          ))}
          <button type="button" className="sidebar-logout" onClick={handleLogout}>
            Log out
          </button>
        </nav>
      </aside>

      <div className="dashboard-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Selected Financial Year</p>
            <select
              value={activeYearId}
              onChange={(event) => setActiveYearId(event.target.value)}
            >
              {financialYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name} {year.isActive ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>
        </header>

        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>

      {sharedOverlays}
    </div>
  )
}
