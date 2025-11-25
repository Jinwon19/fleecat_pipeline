import './StatusChip.css'

const STATUS_MAP = {
  // Task 5 statuses
  all: { label: '전체', color: 'gray' },
  pending: { label: '결제대기', color: 'yellow' },
  preparing: { label: '상품준비중', color: 'blue' },
  shipped: { label: '배송중', color: 'purple' },
  delivered: { label: '배송완료', color: 'green' },
  cancelled: { label: '취소', color: 'red' },
  refunded: { label: '환불', color: 'orange' },

  // Existing schema statuses
  pending_payment: { label: '결제대기', color: 'yellow' },
  payment_completed: { label: '결제완료', color: 'blue' },
  exchange_requested: { label: '교환요청', color: 'orange' },
  return_requested: { label: '반품요청', color: 'orange' }
}

export default function StatusChip({
  status,
  selected = false,
  onClick,
  count
}) {
  const statusInfo = STATUS_MAP[status] || { label: status, color: 'gray' }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`status-chip status-chip--${statusInfo.color} ${
        selected ? 'status-chip--selected' : ''
      }`}
      aria-pressed={selected}
      disabled={!onClick}
    >
      <span className="status-chip__label">{statusInfo.label}</span>
      {count !== undefined && (
        <span className="status-chip__count">{count}</span>
      )}
    </button>
  )
}
