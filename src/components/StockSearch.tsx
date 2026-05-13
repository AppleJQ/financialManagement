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
