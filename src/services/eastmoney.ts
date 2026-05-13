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
  amplitude: number
  changePct: number
  change: number
  turnoverRate: number
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
const STOCK_LIST_TTL = 24 * 60 * 60 * 1000

let sectorsCache: SectorInfo[] | null = null
let sectorsTime = 0
const SECTORS_TTL = 5 * 60 * 1000

let hotStocksCache: StockInfo[] | null = null
let hotStocksTime = 0
const HOT_STOCKS_TTL = 5 * 60 * 1000

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
      return code && name && !code.startsWith('4') && !code.startsWith('8')
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

export async function searchStocks(keyword: string): Promise<StockInfo[]> {
  if (keyword.length < 2) return []
  const all = await fetchAllStocks()
  const kw = keyword.toLowerCase()
  return all
    .filter((s) => s.code.includes(kw) || s.name.includes(keyword))
    .slice(0, 20)
}

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
  // f128 = lead stock code, f140 = lead stock name, f136 = lead stock changePct
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

export async function fetchHotStocks(): Promise<StockInfo[]> {
  const now = Date.now()
  if (hotStocksCache && now - hotStocksTime < HOT_STOCKS_TTL) {
    return hotStocksCache
  }

  const stocks = await fetchAllStocks()
  if (stocks.length === 0) return []

  const byAmount = [...stocks].sort((a, b) => b.amount - a.amount)
  const amountRanks = new Map<string, number>()
  byAmount.forEach((s, i) => amountRanks.set(s.code, i + 1))

  const byTurnover = [...stocks].sort((a, b) => b.turnoverRate - a.turnoverRate)
  const turnoverRanks = new Map<string, number>()
  byTurnover.forEach((s, i) => turnoverRanks.set(s.code, i + 1))

  const scored = stocks
    .map((s) => ({
      ...s,
      score: 0.6 * (amountRanks.get(s.code) ?? stocks.length) +
             0.4 * (turnoverRanks.get(s.code) ?? stocks.length),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 20)

  const result = scored.map(({ score: _, ...rest }) => rest) as StockInfo[]

  hotStocksCache = result
  hotStocksTime = now
  return result
}

export async function getStockInfo(code: string): Promise<StockInfo | null> {
  const all = await fetchAllStocks()
  return all.find((s) => s.code === code) ?? null
}
