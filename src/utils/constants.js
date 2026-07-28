export const FIRM = {
  name: 'VEERPAL SINGH',
  tagline: 'FRUIT COMMISSION AGENTS & ORDER SUPPLIERS',
  address: 'Shop A-1030, New Subzi Mandi, Azadpur, Delhi-33',
  shopAddress: 'Shop : A-1030, New Subzi Mandi Azadpur, Delhi-110033',
  license: 'AKC Lic. No. B-4356',
  contacts: [
    { name: 'Veer Pal Singh', phone: '8802385703' },
    { name: 'Nishant', phone: '7982325090' },
  ],
}

export const FORWARDING_EXPENSE_KEY = 'Forwarding'
export const FORWARDING_DISPLAY_NAME = 'SIT / Forwarding'

export const EXPENSE_LABELS = [
  'Labour & SST',
  'Freight',
  'Tempo Un Loading',
  'Postage',
  'HP Tax',
  'Indemnity',
  'Sampling',
  FORWARDING_EXPENSE_KEY,
  'Bardana Grading',
]

export const FORWARDING_PERCENT_PRESETS = [4, 5, 6, 7, 8, 10]

export const FOOTER_TERMS = [
  'Nett Sale... have been credited in your accounts/paid cash',
  'All disputes repayments of this Sale proceed will settled in DELHI Court',
  'Trade Mark Registered',
  'No Return Without Bill',
  'Goods once sold will not be taken back',
]

export function createEmptyLineItem() {
  return { id: crypto.randomUUID(), description: '', quantity: '', rate: '' }
}

export function createEmptyExpenses() {
  return EXPENSE_LABELS.reduce((acc, label) => {
    acc[label] = ''
    return acc
  }, {})
}

export function createInitialInvoice() {
  const today = new Date()
  const date = today.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'numeric',
    year: '2-digit',
  })

  return {
    grNumber: '',
    date,
    customerName: '',
    truckNumber: '',
    challanNumber: '',
    nag: '',
    totalNags: '',
    nagSummary: '',
    labourAuto: false,
    labourPerNag: '',
    forwardingAuto: false,
    forwardingPercent: '',
    lineItems: [createEmptyLineItem()],
    expenses: createEmptyExpenses(),
    extraExpenses: [{ id: crypto.randomUUID(), name: '', amount: '' }],
  }
}

export function createSampleInvoice() {
  return {
    grNumber: '182',
    date: '5/6/26',
    customerName: 'Sunil Bagh Baglu Prop. Sunil Rohta',
    truckNumber: 'HP 67/8676',
    challanNumber: '002',
    nag: '30 CB=',
    totalNags: '30',
    nagSummary: 'Total NUG is equal to 30 NUG',
    labourAuto: true,
    labourPerNag: '6',
    forwardingAuto: false,
    forwardingPercent: '',
    lineItems: [
      {
        id: crypto.randomUUID(),
        description: 'A/10 Pannet Black cherry',
        quantity: '10',
        rate: '650',
      },
      {
        id: crypto.randomUUID(),
        description: '1/16 Pannet Small size',
        quantity: '16',
        rate: '320',
      },
      {
        id: crypto.randomUUID(),
        description: 'B/1 Pannet cherry',
        quantity: '1',
        rate: '280',
      },
      {
        id: crypto.randomUUID(),
        description: 'S/3 cherry box',
        quantity: '3',
        rate: '200',
      },
    ],
    expenses: {
      'Labour & SST': '180',
      Freight: '735',
      'Tempo Un Loading': '',
      Postage: '20',
      'HP Tax': '60',
      Indemnity: '',
      Sampling: '',
      Forwarding: '',
      'Bardana Grading': '',
    },
    extraExpenses: [{ id: crypto.randomUUID(), name: 'SIT', amount: '180' }],
  }
}
