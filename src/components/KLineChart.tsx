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
  }, [code, renderChart])

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

    chart.createIndicator('MA', false, { id: 'candle_pane' })
    chart.createIndicator('VOL')

    return () => {
      if (chartRef.current) {
        dispose(chartRef.current)
      }
      chartInstanceRef.current = null
    }
  }, [])

  useEffect(() => {
    cacheRef.current.clear()
    loadData(period)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  useEffect(() => {
    loadData(period)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
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
