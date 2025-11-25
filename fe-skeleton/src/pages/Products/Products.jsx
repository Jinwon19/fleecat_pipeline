// src/pages/Products.jsx
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { toastErr } from '../../lib/toast'
import ProductCard from '../../components/ProductCard/ProductCard'
import './Products.css'

export default function Products() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const list = await api.get('/api/products') // 공통 api 호출
        if (alive) setItems(list || [])
      } catch (err) {
        if (alive) setError(err?.message || '상품을 불러오지 못했습니다')
        toastErr(err)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  if (loading) return <div className="products-loading">상품 불러오는 중…</div>
  if (error) return (
    <div className="products-error">
      <p className="products-error__message">{error}</p>
      <button className="products-error__retry" onClick={() => location.reload()}>다시 시도</button>
    </div>
  )
  if (!items.length) return <div className="products-empty">등록된 상품이 없습니다.</div>

  return (
    <div className="product-grid">
      {items.map(p => (
        <ProductCard
          key={p.id}
          product={p}
          variant="link"
        />
      ))}
    </div>
  )
}
