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
