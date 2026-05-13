# A股行情分析网站 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pure-frontend A-share stock analysis website with K-line charts (daily/weekly/monthly) and hot sector/stock recommendations, deployed to Vercel for free.

**Architecture:** React SPA that calls East Money public APIs via JSONP (bypassing CORS). All data fetching, caching, and processing happens in the browser. No backend server. klinecharts renders candlestick charts with built-in MA indicators.

**Tech Stack:** React 18, TypeScript, Vite, TailwindCSS v4, klinecharts@9.8.3, react-router-dom v7

---

## File Structure

```
E:\创业项目\financialManagement\
├── src/
│   ├── components/
│   │   ├── StockSearch.tsx       # Search dropdown with debounce
│   │   └── KLineChart.tsx        # klinecharts wrapper component
│   ├── pages/
│   │   ├── Home.tsx              # Hot sectors + hot stocks
│   │   └── StockDetail.tsx       # K-line chart with period switching
│   ├── services/
│   │   ├── jsonp.ts              # Generic JSONP helper
│   │   └── eastmoney.ts          # All East Money API calls + data transforms
│   ├── utils/
│   │   └── stock.ts              # getSecid(), formatAmount(), validateCode()
│   ├── App.tsx                   # Router setup
│   ├── main.tsx                  # ReactDOM entry
│   └── index.css                 # Tailwind imports
├── public/
├── index.html
├── vite.config.ts
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── tailwind.config.js
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- Create: `tailwind.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/index.css`
- Create: `src/App.tsx` (placeholder)
- Create: `src/vite-env.d.ts`

- [ ] **Step 1: Initialize Vite project**

Run:
```bash
cd "E:\创业项目\financialManagement" && npm create vite@latest . -- --template react-ts
```

If prompted about existing files, choose to overwrite.

- [ ] **Step 2: Install dependencies**

Run:
```bash
cd "E:\创业项目\financialManagement" && npm install && npm install react-router-dom klinecharts@9.8.3 && npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: Configure TailwindCSS v4**

Replace `src/index.css` with:

```css
@import "tailwindcss";
```

Replace `vite.config.ts` with:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

Delete `tailwind.config.js` if it was created — TailwindCSS v4 uses the CSS import approach and does not need a config file.

- [ ] **Step 4: Clean up boilerplate**

Delete unnecessary files:
- `src/App.css`
- `src/assets/react.svg`
- `public/vite.svg`

- [ ] **Step 5: Create minimal App.tsx placeholder**

Replace `src/App.tsx`:

```tsx
function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <h1 className="text-2xl font-bold p-4">A股行情分析</h1>
    </div>
  )
}

export default App
```

- [ ] **Step 6: Verify dev server starts**

Run:
```bash
cd "E:\创业项目\financialManagement" && npm run dev
```

Expected: Vite dev server starts without errors, page shows "A股行情分析" heading. Stop the server after verifying.

- [ ] **Step 7: Initialize git and commit**

```bash
cd "E:\创业项目\financialManagement" && git init && git add -A && git commit -m "chore: scaffold React+TS+Vite+Tailwind project with dependencies"
```

---

### Task 2: JSONP Utility and Stock Helpers

**Files:**
- Create: `src/services/jsonp.ts`
- Create: `src/utils/stock.ts`

This is the foundational layer all other features depend on.

- [ ] **Step 1: Write JSONP utility**

Create `src/services/jsonp.ts`:

```typescript
let counter = 0

export function jsonp<T>(url: string, params: Record<string, string> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const callbackName = `__jsonp_${Date.now()}_${++counter}`
    const script = document.createElement('script')

    const cleanup = () => {
      delete (window as Record<string, unknown>)[callbackName]
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }

    const timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error(`JSONP request timeout: ${url}`))
    }, 15000)

    ;(window as Record<string, unknown>)[callbackName] = (data: T) => {
      clearTimeout(timeoutId)
      cleanup()
      resolve(data)
    }

    const queryString = new URLSearchParams({
      ...params,
      cb: callbackName,
    }).toString()

    script.src = `${url}?${queryString}`
    script.onerror = () => {
      clearTimeout(timeoutId)
      cleanup()
      reject(new Error(`JSONP request failed: ${url}`))
    }

    document.head.appendChild(script)
  })
}
```

- [ ] **Step 2: Write stock utility functions**

Create `src/utils/stock.ts`:

```typescript
/**
 * Convert a 6-digit stock code to East Money secid format.
 * 6开头 -> 上交所 (1.xxx), 0/3开头 -> 深交所 (0.xxx)
 */
export function getSecid(code: string): string {
  if (code.startsWith('6')) {
    return `1.${code}`
  }
  return `0.${code}`
}

/** Validate a stock code is 6 digits. */
export function isValidCode(code: string): boolean {
  return /^\d{6}$/.test(code)
}

/** Format large amounts to readable string, e.g. 1234567890 -> "12.35亿" */
export function formatAmount(value: number): string {
  if (Math.abs(value) >= 1e8) {
    return (value / 1e8).toFixed(2) + '亿'
  }
  if (Math.abs(value) >= 1e4) {
    return (value / 1e4).toFixed(2) + '万'
  }
  return value.toFixed(2)
}

/** Format percentage with sign, e.g. 2.32 -> "+2.32%" */
export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

/** Return CSS class based on positive/negative value */
export function priceColor(value: number): string {
  if (value > 0) return 'text-red-500'
  if (value < 0) return 'text-green-500'
  return 'text-gray-400'
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
cd "E:\创业项目\financialManagement" && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd "E:\创业项目\financialManagement" && git add src/services/jsonp.ts src/utils/stock.ts && git commit -m "feat: add JSONP utility and stock helper functions"
```

---

### Task 3: East Money API Service Layer

**Files:**
- Create: `src/services/eastmoney.ts`

This file encapsulates all external API calls and data transformation.

- [ ] **Step 1: Write the East Money service**

Create `src/services/eastmoney.ts`:

```typescript
import { jsonp } from './jsonp'
import { getSecid } from '../utils/stock'

// ---- Types ----

export interface KLineItem {
  date: string
  open: number
  close: number
  high: number
  low: number
  volume: number
  amount: number
  amplitude: number   // 振幅
  changePct: number   // 涨跌幅
  change: number      // 涨跌额
  turnoverRate: number // 换手率
}

export interface StockInfo {
  code: string
  name: string
  price: number
  changePct: number
  change: number
  turnoverRate: number
  amount: number
  amplitude: number
  high: number
  low: number
  open: number
  preClose: number
}

export interface SectorInfo {
  name: string
  changePct: number
  netAmount: number
  leadStockCode: string
  leadStockName: string
  leadStockChangePct: number
}

// ---- Cache ----

let stockListCache: StockInfo[] | null = null
let stockListTime = 0
const STOCK_LIST_TTL = 24 * 60 * 60 * 1000 // 24 hours

let sectorsCache: SectorInfo[] | null = null
let sectorsTime = 0
const SECTORS_TTL = 5 * 60 * 1000 // 5 minutes

let hotStocksCache: StockInfo[] | null = null
let hotStocksTime = 0
const HOT_STOCKS_TTL = 5 * 60 * 1000 // 5 minutes

// ---- Raw API response types ----

interface EastMoneyResponse<T> {
  rc: number
  rt: number
  svr: number
  lt: number
  full: number
  data?: T
}

interface KLineData {
  code: string
  name: string
  klines: string[]
}

interface StockListData {
  total: number
  diff: Array<Record<string, unknown>>
}

// ---- API functions ----

const KLT_MAP: Record<string, string> = {
  daily: '101',
  weekly: '102',
  monthly: '103',
}

/**
 * Fetch K-line data for a stock.
 */
export async function fetchKLine(
  code: string,
  period: 'daily' | 'weekly' | 'monthly' = 'daily',
  limit = 120
): Promise<KLineItem[]> {
  const secid = getSecid(code)
  const resp = await jsonp<EastMoneyResponse<KLineData>>(
    'https://push2his.eastmoney.com/api/qt/stock/kline/get',
    {
      secid,
      fields1: 'f1,f2,f3,f4,f5,f6',
      fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
      klt: KLT_MAP[period],
      fqt: '1',
      beg: '0',
      end: '20500101',
      lmt: String(limit),
    }
  )

  if (!resp.data?.klines) return []

  return resp.data.klines.map((line) => {
    const parts = line.split(',')
    return {
      date: parts[0],
      open: parseFloat(parts[1]),
      close: parseFloat(parts[2]),
      high: parseFloat(parts[3]),
      low: parseFloat(parts[4]),
      volume: parseFloat(parts[5]),
      amount: parseFloat(parts[6]),
      amplitude: parseFloat(parts[7]),
      changePct: parseFloat(parts[8]),
      change: parseFloat(parts[9]),
      turnoverRate: parseFloat(parts[10]),
    }
  })
}

/**
 * Fetch all A-share stocks with current quotes.
 * Results are cached for 24 hours.
 */
export async function fetchAllStocks(): Promise<StockInfo[]> {
  const now = Date.now()
  if (stockListCache && now - stockListTime < STOCK_LIST_TTL) {
    return stockListCache
  }

  const resp = await jsonp<EastMoneyResponse<StockListData>>(
    'https://push2.eastmoney.com/api/qt/clist/get',
    {
      pn: '1',
      pz: '5000',
      po: '1',
      np: '1',
      fltt: '2',
      invt: '2',
      fid: 'f3',
      fs: 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23',
      fields: 'f2,f3,f4,f5,f6,f7,f8,f12,f14,f15,f16,f17,f18',
    }
  )

  if (!resp.data?.diff) return []

  const stocks: StockInfo[] = resp.data.diff
    .filter((item) => {
      const code = String(item.f12 ?? '')
      const name = String(item.f14 ?? '')
      return code && name && !code.startsWith('4') && !code.startsWith('8') // exclude 北交所
    })
    .map((item) => ({
      code: String(item.f12),
      name: String(item.f14),
      price: Number(item.f2) || 0,
      changePct: Number(item.f3) || 0,
      change: Number(item.f4) || 0,
      turnoverRate: Number(item.f5) || 0,
      amount: Number(item.f6) || 0,
      amplitude: Number(item.f7) || 0,
      high: Number(item.f15) || 0,
      low: Number(item.f16) || 0,
      open: Number(item.f17) || 0,
      preClose: Number(item.f18) || 0,
    }))

  stockListCache = stocks
  stockListTime = now
  return stocks
}

/**
 * Search stocks by keyword (matches code or name).
 */
export async function searchStocks(keyword: string): Promise<StockInfo[]> {
  if (keyword.length < 2) return []
  const all = await fetchAllStocks()
  const kw = keyword.toLowerCase()
  return all
    .filter((s) => s.code.includes(kw) || s.name.includes(keyword))
    .slice(0, 20)
}

/**
 * Fetch hot sectors ranked by capital flow.
 * Results are cached for 5 minutes.
 */
export async function fetchHotSectors(): Promise<SectorInfo[]> {
  const now = Date.now()
  if (sectorsCache && now - sectorsTime < SECTORS_TTL) {
    return sectorsCache
  }

  const resp = await jsonp<EastMoneyResponse<StockListData>>(
    'https://push2.eastmoney.com/api/qt/clist/get',
    {
      fs: 'm:90+t:2+f:!50',
      fields: 'f2,f3,f4,f8,f12,f14,f62,f104,f105,f128,f136,f140',
      fid: 'f62',
      po: '1',
      pn: '1',
      pz: '10',
      np: '1',
      fltt: '2',
      invt: '2',
    }
  )

  if (!resp.data?.diff) return []

  // Note: East Money sector lead stock fields (community-documented):
  // f128 = 领涨股代码, f140 = 领涨股名称, f136 = 领涨股涨跌幅
  // These differ from spec which listed f84/f104/f105 — the spec mapping
  // is updated here based on actual API testing.
  const sectors: SectorInfo[] = resp.data.diff.map((item) => ({
    name: String(item.f14 ?? ''),
    changePct: Number(item.f3) || 0,
    netAmount: Number(item.f62) || 0,
    leadStockCode: String(item.f128 ?? ''),
    leadStockName: String(item.f140 ?? ''),
    leadStockChangePct: Number(item.f136) || 0,
  }))

  sectorsCache = sectors
  sectorsTime = now
  return sectors
}

/**
 * Calculate hot stocks using rank-weighted scoring.
 * weight: amount 60%, turnover 40%.
 * Results are cached for 5 minutes.
 */
export async function fetchHotStocks(): Promise<StockInfo[]> {
  const now = Date.now()
  if (hotStocksCache && now - hotStocksTime < HOT_STOCKS_TTL) {
    return hotStocksCache
  }

  const stocks = await fetchAllStocks()
  if (stocks.length === 0) return []

  // Rank by amount (desc)
  const byAmount = [...stocks].sort((a, b) => b.amount - a.amount)
  const amountRanks = new Map<string, number>()
  byAmount.forEach((s, i) => amountRanks.set(s.code, i + 1))

  // Rank by turnover rate (desc)
  const byTurnover = [...stocks].sort((a, b) => b.turnoverRate - a.turnoverRate)
  const turnoverRanks = new Map<string, number>()
  byTurnover.forEach((s, i) => turnoverRanks.set(s.code, i + 1))

  // Score and sort
  const scored = stocks
    .map((s) => ({
      ...s,
      score: 0.6 * (amountRanks.get(s.code) ?? stocks.length) +
             0.4 * (turnoverRanks.get(s.code) ?? stocks.length),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 20)

  // Remove score from output
  const result = scored.map(({ score: _, ...rest }) => rest) as StockInfo[]

  hotStocksCache = result
  hotStocksTime = now
  return result
}

/**
 * Get a single stock's info from cached stock list.
 */
export async function getStockInfo(code: string): Promise<StockInfo | null> {
  const all = await fetchAllStocks()
  return all.find((s) => s.code === code) ?? null
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd "E:\创业项目\financialManagement" && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd "E:\创业项目\financialManagement" && git add src/services/eastmoney.ts && git commit -m "feat: add East Money API service layer with JSONP and caching"
```

---

### Task 4: Router Setup

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Set up React Router in App.tsx**

Replace `src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import StockDetail from './pages/StockDetail'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900 text-white">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stock/:code" element={<StockDetail />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
```

- [ ] **Step 2: Update main.tsx to remove StrictMode conflicts**

Ensure `src/main.tsx` is:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 3: Create placeholder pages**

Create `src/pages/Home.tsx`:

```tsx
export default function Home() {
  return <div className="p-4">首页 - 开发中</div>
}
```

Create `src/pages/StockDetail.tsx`:

```tsx
import { useParams } from 'react-router-dom'

export default function StockDetail() {
  const { code } = useParams<{ code: string }>()
  return <div className="p-4">个股详情 - {code}</div>
}
```

- [ ] **Step 4: Verify dev server and routing**

Run:
```bash
cd "E:\创业项目\financialManagement" && npm run dev
```

Expected: Home page shows "首页 - 开发中". Navigate to `/stock/000001` shows "个股详情 - 000001".

- [ ] **Step 5: Commit**

```bash
cd "E:\创业项目\financialManagement" && git add src/App.tsx src/main.tsx src/pages/Home.tsx src/pages/StockDetail.tsx && git commit -m "feat: add React Router with Home and StockDetail routes"
```

---

### Task 5: StockSearch Component

**Files:**
- Create: `src/components/StockSearch.tsx`

A reusable search box with debounce and dropdown results.

- [ ] **Step 1: Write StockSearch component**

Create `src/components/StockSearch.tsx`:

```tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchStocks, type StockInfo } from '../services/eastmoney'

export default function StockSearch() {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<StockInfo[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)

  const doSearch = useCallback(async (kw: string) => {
    if (kw.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const data = await searchStocks(kw)
      setResults(data)
      setShowDropdown(true)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (value: string) => {
    setKeyword(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(value), 300)
  }

  const handleSelect = (stock: StockInfo) => {
    setKeyword('')
    setShowDropdown(false)
    setResults([])
    navigate(`/stock/${stock.code}`)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <input
        type="text"
        value={keyword}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setShowDropdown(true)}
        placeholder="输入股票代码或名称搜索..."
        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {results.map((stock) => (
            <button
              key={stock.code}
              onClick={() => handleSelect(stock)}
              className="w-full px-4 py-2 text-left hover:bg-gray-700 flex justify-between items-center"
            >
              <span>
                <span className="text-gray-400 mr-2">{stock.code}</span>
                <span>{stock.name}</span>
              </span>
              <span className={stock.changePct > 0 ? 'text-red-500' : stock.changePct < 0 ? 'text-green-500' : 'text-gray-400'}>
                {stock.price > 0 ? stock.price.toFixed(2) : '--'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd "E:\创业项目\financialManagement" && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd "E:\创业项目\financialManagement" && git add src/components/StockSearch.tsx && git commit -m "feat: add StockSearch component with debounce and dropdown"
```

---

### Task 6: KLineChart Component

**Files:**
- Create: `src/components/KLineChart.tsx`

Wraps klinecharts library with period switching and loading state.

- [ ] **Step 1: Write KLineChart component**

Create `src/components/KLineChart.tsx`:

```tsx
import { useRef, useEffect, useState, useCallback } from 'react'
import { init, dispose, type Chart } from 'klinecharts'
import { fetchKLine, type KLineItem } from '../services/eastmoney'

interface Props {
  code: string
}

type Period = 'daily' | 'weekly' | 'monthly'

const PERIOD_LABELS: Record<Period, string> = {
  daily: '日线',
  weekly: '周线',
  monthly: '月线',
}

export default function KLineChart({ code }: Props) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<Chart | null>(null)
  const [period, setPeriod] = useState<Period>('daily')
  const [loading, setLoading] = useState(false)
  const cacheRef = useRef<Map<string, KLineItem[]>>(new Map())

  const loadData = useCallback(async (p: Period) => {
    const cacheKey = `${code}_${p}`
    const cached = cacheRef.current.get(cacheKey)
    if (cached) {
      renderChart(cached)
      return
    }

    setLoading(true)
    try {
      const data = await fetchKLine(code, p, 120)
      cacheRef.current.set(cacheKey, data)
      renderChart(data)
    } catch (err) {
      console.error('Failed to fetch kline data:', err)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  const renderChart = useCallback((data: KLineItem[]) => {
    if (!chartInstanceRef.current) return

    chartInstanceRef.current.applyNewData(
      data.map((item) => ({
        timestamp: new Date(item.date).getTime(),
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
      }))
    )
  }, [])

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current) return

    const chart = init(chartRef.current, {
      styles: {
        grid: {
          show: true,
          horizontal: { color: 'rgba(255,255,255,0.06)' },
          vertical: { color: 'rgba(255,255,255,0.06)' },
        },
        candle: {
          priceMark: {
            last: {
              text: { color: 'white' },
            },
          },
          tooltip: {
            text: { color: 'white' },
          },
        },
        indicator: {
          tooltip: {
            text: { color: 'white' },
          },
        },
        xAxis: {
          tickText: { color: '#9ca3af' },
        },
        yAxis: {
          tickText: { color: '#9ca3af' },
        },
        crosshair: {
          horizontal: {
            text: { color: 'white', backgroundColor: '#374151' },
          },
          vertical: {
            text: { color: 'white', backgroundColor: '#374151' },
          },
        },
      },
    })

    chartInstanceRef.current = chart

    // Add MA indicator on main pane
    chart.createIndicator('MA', false, { id: 'candle_pane' })
    // Add volume indicator on sub pane
    chart.createIndicator('VOL')

    return () => {
      if (chartRef.current) {
        dispose(chartRef.current)
      }
      chartInstanceRef.current = null
    }
  }, [])

  // Load data when code or period changes
  useEffect(() => {
    cacheRef.current.clear()
    loadData(period)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  useEffect(() => {
    loadData(period)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  const handlePeriodChange = (p: Period) => {
    setPeriod(p)
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => handlePeriodChange(p)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              period === p
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      <div className="relative bg-gray-800 rounded-lg overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-800/80">
            <div className="w-8 h-8 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div ref={chartRef} className="w-full" style={{ height: '500px' }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd "E:\创业项目\financialManagement" && npx tsc --noEmit
```

Expected: No errors. (There may be warnings about klinecharts types — these are acceptable.)

- [ ] **Step 3: Commit**

```bash
cd "E:\创业项目\financialManagement" && git add src/components/KLineChart.tsx && git commit -m "feat: add KLineChart component with klinecharts, MA indicator, and period switching"
```

---

### Task 7: Home Page

**Files:**
- Modify: `src/pages/Home.tsx`

The main page showing hot sectors and hot stocks.

- [ ] **Step 1: Implement Home page**

Replace `src/pages/Home.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StockSearch from '../components/StockSearch'
import { fetchHotSectors, fetchHotStocks, type SectorInfo, type StockInfo } from '../services/eastmoney'
import { formatAmount, formatPercent, priceColor } from '../utils/stock'

export default function Home() {
  const [sectors, setSectors] = useState<SectorInfo[]>([])
  const [stocks, setStocks] = useState<StockInfo[]>([])
  const [loadingSectors, setLoadingSectors] = useState(true)
  const [loadingStocks, setLoadingStocks] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchHotSectors()
      .then(setSectors)
      .catch(() => setSectors([]))
      .finally(() => setLoadingSectors(false))

    fetchHotStocks()
      .then(setStocks)
      .catch(() => setStocks([]))
      .finally(() => setLoadingStocks(false))
  }, [])

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">A股行情分析</h1>
        <StockSearch />
      </div>

      {/* Hot Sectors */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">热门板块</h2>
        {loadingSectors ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : sectors.length === 0 ? (
          <p className="text-gray-500">当前非交易时段，暂无板块数据</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {sectors.map((sector) => (
              <button
                key={sector.name}
                onClick={() => {
                  if (sector.leadStockCode) {
                    navigate(`/stock/${sector.leadStockCode}`)
                  }
                }}
                className="bg-gray-800 rounded-lg p-4 text-left hover:bg-gray-750 transition-colors border border-gray-700 hover:border-gray-600"
              >
                <div className="font-medium mb-2 truncate">{sector.name}</div>
                <div className={`text-lg font-bold ${priceColor(sector.changePct)}`}>
                  {formatPercent(sector.changePct)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  净流入 {formatAmount(sector.netAmount)}
                </div>
                {sector.leadStockName && (
                  <div className="text-xs text-gray-400 mt-1 truncate">
                    领涨: {sector.leadStockName}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Hot Stocks */}
      <section>
        <h2 className="text-lg font-semibold mb-4">热门个股</h2>
        {loadingStocks ? (
          <div className="bg-gray-800 rounded-lg p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        ) : stocks.length === 0 ? (
          <p className="text-gray-500">当前非交易时段，暂无个股数据</p>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-sm">
                  <th className="text-left px-4 py-3">代码</th>
                  <th className="text-left px-4 py-3">名称</th>
                  <th className="text-right px-4 py-3">最新价</th>
                  <th className="text-right px-4 py-3">涨跌幅</th>
                  <th className="text-right px-4 py-3 hidden md:table-cell">成交额</th>
                  <th className="text-right px-4 py-3 hidden md:table-cell">换手率</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((stock) => (
                  <tr
                    key={stock.code}
                    onClick={() => navigate(`/stock/${stock.code}`)}
                    className="border-b border-gray-700/50 hover:bg-gray-700/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-400">{stock.code}</td>
                    <td className="px-4 py-3">{stock.name}</td>
                    <td className={`px-4 py-3 text-right ${priceColor(stock.change)}`}>
                      {stock.price > 0 ? stock.price.toFixed(2) : '--'}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${priceColor(stock.changePct)}`}>
                      {formatPercent(stock.changePct)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 hidden md:table-cell">
                      {formatAmount(stock.amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 hidden md:table-cell">
                      {stock.turnoverRate.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="mt-8 text-center text-xs text-gray-600">
        数据来源：东方财富 | 仅供参考，不构成投资建议
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd "E:\创业项目\financialManagement" && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd "E:\创业项目\financialManagement" && git add src/pages/Home.tsx && git commit -m "feat: implement Home page with hot sectors and hot stocks"
```

---

### Task 8: StockDetail Page

**Files:**
- Modify: `src/pages/StockDetail.tsx`

Individual stock detail page with real-time quote info and K-line chart.

- [ ] **Step 1: Implement StockDetail page**

Replace `src/pages/StockDetail.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StockSearch from '../components/StockSearch'
import KLineChart from '../components/KLineChart'
import { getStockInfo, type StockInfo } from '../services/eastmoney'
import { formatAmount, formatPercent, priceColor } from '../utils/stock'

export default function StockDetail() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!code) return
    setLoading(true)
    getStockInfo(code)
      .then((info) => setStockInfo(info))
      .catch(() => setStockInfo(null))
      .finally(() => setLoading(false))
  }, [code])

  if (!code) {
    return <div className="p-4 text-gray-400">无效的股票代码</div>
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/')}
          className="px-3 py-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors text-sm"
        >
          ← 返回
        </button>
        <h1 className="text-xl font-bold">
          {stockInfo ? `${stockInfo.name}(${code})` : code}
        </h1>
        <div className="ml-auto">
          <StockSearch />
        </div>
      </div>

      {/* Real-time Quote */}
      {loading ? (
        <div className="bg-gray-800 rounded-lg p-4 mb-6 animate-pulse h-20" />
      ) : stockInfo ? (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-baseline gap-4 mb-3">
            <span className={`text-3xl font-bold ${priceColor(stockInfo.change)}`}>
              {stockInfo.price > 0 ? stockInfo.price.toFixed(2) : '--'}
            </span>
            <span className={`text-lg ${priceColor(stockInfo.change)}`}>
              {formatPercent(stockInfo.changePct)}
            </span>
            <span className={`text-sm ${priceColor(stockInfo.change)}`}>
              {stockInfo.change > 0 ? '+' : ''}{stockInfo.change.toFixed(2)}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
            <div>
              <span className="text-gray-500">开盘</span>
              <span className="ml-2">{stockInfo.open > 0 ? stockInfo.open.toFixed(2) : '--'}</span>
            </div>
            <div>
              <span className="text-gray-500">最高</span>
              <span className="ml-2 text-red-500">{stockInfo.high > 0 ? stockInfo.high.toFixed(2) : '--'}</span>
            </div>
            <div>
              <span className="text-gray-500">最低</span>
              <span className="ml-2 text-green-500">{stockInfo.low > 0 ? stockInfo.low.toFixed(2) : '--'}</span>
            </div>
            <div>
              <span className="text-gray-500">成交量</span>
              <span className="ml-2">{formatAmount(stockInfo.amount)}</span>
            </div>
            <div>
              <span className="text-gray-500">换手率</span>
              <span className="ml-2">{stockInfo.turnoverRate.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg p-4 mb-6 text-gray-400">
          未找到该股票的实时行情数据
        </div>
      )}

      {/* K-Line Chart */}
      <KLineChart code={code} />

      <footer className="mt-8 text-center text-xs text-gray-600">
        数据来源：东方财富 | 仅供参考，不构成投资建议
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd "E:\创业项目\financialManagement" && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd "E:\创业项目\financialManagement" && git add src/pages/StockDetail.tsx && git commit -m "feat: implement StockDetail page with quote info and K-line chart"
```

---

### Task 9: Final Integration and Build Verification

**Files:**
- Modify: `index.html` (title update)
- Verify production build

- [ ] **Step 1: Update page title**

In `index.html`, change the `<title>` to:

```html
<title>A股行情分析</title>
```

- [ ] **Step 2: Run production build**

Run:
```bash
cd "E:\创业项目\financialManagement" && npm run build
```

Expected: Build completes without errors. `dist/` directory is created with bundled files.

- [ ] **Step 3: Preview production build locally**

Run:
```bash
cd "E:\创业项目\financialManagement" && npm run preview
```

Expected: Preview server starts. Open browser and verify:
- Home page loads with hot sectors and hot stocks data
- Search box works
- Clicking a stock navigates to detail page
- K-line chart renders with data
- Period switching (daily/weekly/monthly) works

- [ ] **Step 4: Final commit**

```bash
cd "E:\创业项目\financialManagement" && git add -A && git commit -m "chore: update page title and verify production build"
```

---

### Task 10: Vercel Deployment Preparation

**Files:**
- Create: `vercel.json` (optional, for SPA routing)

- [ ] **Step 1: Create vercel.json for SPA routing**

Create `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/((?!assets/).*)", "destination": "/index.html" }
  ]
}
```

This ensures React Router works correctly on Vercel — all non-asset routes are served `index.html`.

- [ ] **Step 2: Ensure .gitignore exists and includes node_modules/dist**

Verify `.gitignore` contains at minimum:
```
node_modules
dist
```

(Vite scaffolding creates this by default.)

- [ ] **Step 3: Commit**

```bash
cd "E:\创业项目\financialManagement" && git add vercel.json .gitignore && git commit -m "chore: add Vercel deployment config with SPA rewrites"
```

- [ ] **Step 4: Push to GitHub and deploy to Vercel**

```bash
# Create GitHub repo and push (user does this manually)
# Then import in Vercel dashboard
```

The user needs to:
1. Create a GitHub repository
2. Push the code: `git remote add origin <repo-url> && git push -u origin main`
3. Go to vercel.com, import the repository
4. Framework preset: Vite (auto-detected)
5. Click Deploy
