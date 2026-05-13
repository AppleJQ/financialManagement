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
