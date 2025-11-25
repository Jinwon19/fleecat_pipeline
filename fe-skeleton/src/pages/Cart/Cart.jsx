// src/pages/Cart.jsx
import { useEffect, useMemo, useState } from 'react'
import { getCart, removeFromCart, clearCart } from '../../utils/cart'
import { toastOk, toastErr } from '../../lib/toast'

export default function Cart() {
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 초기 로드
  useEffect(() => {
    try {
      setLoading(true)
      const items = getCart()
      setCart(Array.isArray(items) ? items : [])
    } catch (e) {
      setError('장바구니를 불러오는 중 오류가 발생했습니다.')
      toastErr(e)
    } finally {
      setLoading(false)
    }
  }, [])

  // 합계
  const total = useMemo(
    () => cart.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 0), 0),
    [cart]
  )

  const handleRemove = (id) => {
    try {
      // 스냅샷(Optional: 되돌리기용)
      // const snapshot = getCart()
      removeFromCart(id)
      setCart(getCart())
      toastOk('삭제했습니다')
      // 되돌리기 필요하면:
      // toastUndo({ onUndo: () => { localStorage.setItem('cart', JSON.stringify(snapshot)); setCart(snapshot) } })
    } catch (e) {
      toastErr(e)
    }
  }

  const handleClear = () => {
    try {
      // const snapshot = getCart()
      clearCart()
      setCart([])
      toastOk('모두 비웠습니다')
      // 되돌리기 필요하면:
      // toastUndo({ onUndo: () => { localStorage.setItem('cart', JSON.stringify(snapshot)); setCart(snapshot) } })
    } catch (e) {
      toastErr(e)
    }
  }

  if (loading) return <div style={{ padding: 24 }}>장바구니 불러오는 중…</div>
  if (error) return (
    <div style={{ padding: 24 }}>
      <p style={{ color: 'crimson' }}>{error}</p>
      <button onClick={() => location.reload()}>다시 시도</button>
    </div>
  )

  return (
    <div style={{ padding: 20 }}>
      <h2>🛒 장바구니</h2>

      {cart.length === 0 ? (
        <p>장바구니가 비었습니다.</p>
      ) : (
        <>
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
            {cart.map(item => (
              <li
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '64px 1fr auto',
                  gap: 12,
                  alignItems: 'center',
                  border: '1px solid #eee',
                  borderRadius: 8,
                  padding: 10,
                  background: '#fff',
                }}
              >
                <img
                  src={item.image_url}
                  alt={item.name}
                  style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }}
                />
                <div>
                  <div style={{ fontWeight: 700 }}>{item.name}</div>
                  <div style={{ color: '#666', fontSize: 13 }}>
                    {Number(item.price).toLocaleString()}원 × {item.quantity}
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(item.id)}
                  style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: 'pointer' }}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <strong>합계</strong>
            <strong>{total.toLocaleString()}원</strong>
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button
              onClick={handleClear}
              style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: 'pointer' }}
            >
              전체 비우기
            </button>
            <button
              onClick={() => alert('결제 플로우는 다음 단계에서 구현합니다.')}
              style={{ padding: '8px 12px', borderRadius: 8, background: '#1e5eff', color: '#fff', border: '1px solid #1e5eff', cursor: 'pointer' }}
            >
              결제하기
            </button>
          </div>
        </>
      )}
    </div>
  )
}
