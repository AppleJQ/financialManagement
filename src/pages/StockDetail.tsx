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
              <span className="text-gray-500">成交额</span>
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
