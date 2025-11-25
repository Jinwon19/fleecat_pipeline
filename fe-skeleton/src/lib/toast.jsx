// src/lib/toast.js
import toast from 'react-hot-toast'

// default export 추가
export default toast

export const toastOk = (msg) =>
  toast.success(msg ?? '완료되었습니다 ✅')

export const toastErr = (err) => {
  const msg =
    typeof err === 'string' ? err :
    err?.message ? err.message :
    '문제가 발생했습니다 ❌'
  toast.error(msg)
}

export const toastLoading = (
  promise,
  { loading='처리중...', success='완료!', error='실패했습니다' } = {}
) =>
  toast.promise(promise, { loading, success, error })

// ✅ 추가: 장바구니 전용 토스트
export const toastCartAdded = ({ product, qty = 1, onUndo, onGoCart }) => {
  toast.custom((t) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: '#111',
        color: '#fff',
        padding: '12px 14px',
        borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,.24)',
        width: 320,
      }}
    >
      {product?.image_url && (
        <img
          src={product.image_url}
          alt={product.name}
          style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 8 }}
        />
      )}

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>장바구니에 담았습니다</div>
        <div style={{ opacity: 0.85, fontSize: 13 }}>
          {product?.name} · {qty}개
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          {onUndo && (
            <button
              onClick={() => { onUndo(); toast.dismiss(t.id) }}
              style={{ padding:'6px 10px', borderRadius:8, border:'1px solid #555', background:'#222', color:'#fff', cursor:'pointer' }}
            >
              되돌리기
            </button>
          )}
          {onGoCart && (
            <button
              onClick={() => { onGoCart(); toast.dismiss(t.id) }}
              style={{ padding:'6px 10px', borderRadius:8, background:'#1e5eff', border:'1px solid #1e5eff', color:'#fff', cursor:'pointer' }}
            >
              장바구니 보기
            </button>
          )}
        </div>
      </div>

      <button
        onClick={() => toast.dismiss(t.id)}
        style={{ background:'transparent', border:'none', color:'#aaa', cursor:'pointer', fontSize:18, lineHeight:1 }}
        aria-label="close"
      >
        ×
      </button>
    </div>
  ), { duration: 3000 })
}

