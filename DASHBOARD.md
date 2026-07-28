# Dashboard Implementation

## Plan

The existing client-only invoice app was extended into a full business dashboard without removing the original invoice form, preview, PDF export, labour auto-calc, or SIT / Forwarding logic.

### Architecture

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite + React Router |
| Backend | Express 5 API |
| Database | SQLite via Prisma ORM |
| Money math | Decimal.js on backend |
| Mobile | Capacitor (unchanged) |

### Files Created

**Backend (`server/`)**
- `prisma/schema.prisma` — all tables and relations
- `src/index.js` — Express app
- `src/lib/prisma.js`, `money.js`, `errors.js`
- `src/services/invoiceService.js` — invoice CRUD + serial numbers
- `src/services/teepService.js` — TEEP calculations + bills
- `src/services/moduleService.js` — Red Book, Ledger, Day Book, Arrival
- `src/services/dashboardService.js` — summary + ledger balances
- `src/services/serialService.js` — invoice / TEEP / bill numbers
- `src/routes/*.js` — REST APIs
- `src/seed.js` — default financial year `2026-27`

**Frontend (`src/`)**
- `api/client.js` — API wrapper
- `context/AppContext.jsx` — year selector, toasts, confirm dialogs
- `layout/DashboardLayout.jsx` — sidebar + top bar
- `components/ui/index.jsx` — shared UI
- `pages/DashboardHome.jsx`
- `pages/InvoiceListPage.jsx`
- `pages/InvoiceEditorPage.jsx` — wraps existing invoice UI
- `pages/SimpleModulePage.jsx` + `moduleConfigs.jsx`
- `pages/TeepPage.jsx`
- `pages/FinancialYearsPage.jsx`
- `utils/invoiceMapper.js` — form ↔ database mapping

### Files Modified

- `src/App.jsx` — dashboard routing
- `src/main.jsx`
- `src/App.css` — dashboard styles
- `package.json`, `vite.config.js`, `.gitignore`, `README.md`

## Modules

1. **Invoice** — full CRUD, auto serial `INV/2026-27/0001`, existing commission invoice UI
2. **Red Book** — CRUD with amount = qty × rate
3. **Ledger** — debit/credit with running balance
4. **Day Book** — daily vouchers
5. **Arrival** — goods arrival records
6. **TEEP** — multi-customer daily sales, discounts, additional charges, payment terms, bills

## Financial Year

- Every record has `FinancialYearId`
- Top bar year selector filters all modules
- Unique invoice serial per year: `@@unique([financialYearId, serialNumber])`
- Serial generated inside DB transaction

## How to Run

### 1. Setup database (one time)

```bash
cd /Users/veerpalsingh/business
npm run db:setup
```

### 2. Start backend

```bash
npm run dev:server
```

API: `http://localhost:3001`

### 3. Start frontend

```bash
npm run dev
```

App: `http://localhost:5173`

## Testing Checklist

### Financial Year
- [ ] Open **Financial Years**
- [ ] Create `2027-28`
- [ ] Activate it from top bar

### Invoice
- [ ] Create invoice → saves as `INV/2026-27/0001`
- [ ] Create second invoice → `0002`
- [ ] Search by customer name
- [ ] Edit, cancel, delete
- [ ] Save PDF

### Red Book / Ledger / Day Book / Arrival
- [ ] Add record
- [ ] Edit and delete
- [ ] Search works

### TEEP
- [ ] Create TEEP with 2 customers
- [ ] Add items and additional charges
- [ ] View daily summary
- [ ] Check payment status and due date

### Dashboard
- [ ] Summary cards update for selected year
- [ ] Recent activity shows latest invoices / TEEP

## API Endpoints

- `GET /api/dashboard/summary?financialYearId=`
- `GET/POST /api/dashboard/financial-years`
- `GET/POST/PUT/DELETE /api/invoices`
- `GET/POST/PUT/DELETE /api/modules/red-book`
- `GET/POST/PUT/DELETE /api/modules/ledger`
- `GET/POST/PUT/DELETE /api/modules/day-book`
- `GET/POST/PUT/DELETE /api/modules/arrivals`
- `GET/POST/PUT/DELETE /api/teep`

## Mobile Note

The Android app needs the backend running on your Mac (or a hosted server). Set:

```bash
VITE_API_URL=http://YOUR_MAC_IP:3001/api
```

when building the APK.

## Still Preserved

- Original invoice layout and calculations
- Labour per nag auto-calc
- SIT / Forwarding % auto-calc
- PDF export via Save PDF
- Capacitor Android build scripts
