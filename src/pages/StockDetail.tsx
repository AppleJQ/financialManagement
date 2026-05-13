import { useParams } from 'react-router-dom'

export default function StockDetail() {
  const { code } = useParams<{ code: string }>()
  return <div className="p-4">个股详情 - {code}</div>
}
