import { Capacitor } from '@capacitor/core'
import { localApi } from '../db/localApi.js'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function remoteRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (response.status === 204) return null

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }
  return data
}

const remoteApi = {
  getDashboardSummary: (financialYearId) =>
    remoteRequest(`/dashboard/summary?financialYearId=${financialYearId}`),
  getFinancialYears: () => remoteRequest('/dashboard/financial-years'),
  createFinancialYear: (body) =>
    remoteRequest('/dashboard/financial-years', { method: 'POST', body: JSON.stringify(body) }),
  activateFinancialYear: (id) =>
    remoteRequest(`/dashboard/financial-years/${id}/activate`, { method: 'PATCH' }),
  listInvoices: (params) => remoteRequest(`/invoices?${new URLSearchParams(params)}`),
  getInvoice: (id) => remoteRequest(`/invoices/${id}`),
  getInvoiceFormState: (id) => remoteRequest(`/invoices/${id}/form-state`),
  createInvoice: (body) =>
    remoteRequest('/invoices', { method: 'POST', body: JSON.stringify(body) }),
  updateInvoice: (id, body) =>
    remoteRequest(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  cancelInvoice: (id) => remoteRequest(`/invoices/${id}/cancel`, { method: 'POST' }),
  deleteInvoice: (id) => remoteRequest(`/invoices/${id}`, { method: 'DELETE' }),
  listRedBook: (params) => remoteRequest(`/modules/red-book?${new URLSearchParams(params)}`),
  createRedBook: (body) =>
    remoteRequest('/modules/red-book', { method: 'POST', body: JSON.stringify(body) }),
  updateRedBook: (id, body) =>
    remoteRequest(`/modules/red-book/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteRedBook: (id) => remoteRequest(`/modules/red-book/${id}`, { method: 'DELETE' }),
  listLedger: (params) => remoteRequest(`/modules/ledger?${new URLSearchParams(params)}`),
  createLedger: (body) =>
    remoteRequest('/modules/ledger', { method: 'POST', body: JSON.stringify(body) }),
  updateLedger: (id, body) =>
    remoteRequest(`/modules/ledger/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteLedger: (id) => remoteRequest(`/modules/ledger/${id}`, { method: 'DELETE' }),
  listDayBook: (params) => remoteRequest(`/modules/day-book?${new URLSearchParams(params)}`),
  getDayBookDailyTotals: (financialYearId, date) =>
    remoteRequest(`/modules/day-book/daily-totals?financialYearId=${financialYearId}&date=${date}`),
  createDayBook: (body) =>
    remoteRequest('/modules/day-book', { method: 'POST', body: JSON.stringify(body) }),
  updateDayBook: (id, body) =>
    remoteRequest(`/modules/day-book/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteDayBook: (id) => remoteRequest(`/modules/day-book/${id}`, { method: 'DELETE' }),
  listArrivals: (params) => remoteRequest(`/modules/arrivals?${new URLSearchParams(params)}`),
  createArrival: (body) =>
    remoteRequest('/modules/arrivals', { method: 'POST', body: JSON.stringify(body) }),
  updateArrival: (id, body) =>
    remoteRequest(`/modules/arrivals/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteArrival: (id) => remoteRequest(`/modules/arrivals/${id}`, { method: 'DELETE' }),
  listTeep: (params) => remoteRequest(`/teep?${new URLSearchParams(params)}`),
  getTeep: (id) => remoteRequest(`/teep/${id}`),
  getTeepSummary: (id) => remoteRequest(`/teep/${id}/summary`),
  getTeepCustomerBill: (customerId) => remoteRequest(`/teep/customers/${customerId}/bill`),
  createTeep: (body) => remoteRequest('/teep', { method: 'POST', body: JSON.stringify(body) }),
  updateTeep: (id, body) => remoteRequest(`/teep/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTeep: (id) => remoteRequest(`/teep/${id}`, { method: 'DELETE' }),
}

export const api = Capacitor.isNativePlatform() ? localApi : remoteApi

export async function initAppData() {
  if (Capacitor.isNativePlatform()) {
    const { initLocalDb } = await import('../db/localDb.js')
    await initLocalDb()
  }
}
