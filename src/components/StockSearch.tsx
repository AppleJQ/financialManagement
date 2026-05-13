import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchStocks, type StockInfo } from '../services/eastmoney'

export default function StockSearch() {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<StockInfo[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const doSearch = useCallback(async (kw: string) => {
    const trimmed = kw.trim()
    if (trimmed.length < 1) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const data = await searchStocks(trimmed)
      setResults(data)
      setShowDropdown(data.length > 0)
    } catch (err) {
      console.error('Search failed:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSearch = () => {
    if (keyword.trim()) {
      doSearch(keyword)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
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
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder="输入股票代码或名称"
          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors whitespace-nowrap flex items-center gap-1"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
          搜索
        </button>
      </div>
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
