import Button from '../../../../components/common/Button'
import StatusChip from '../../../../components/common/StatusChip'
import './OrderCard.css'

const STATUS_INFO = {
  // Legacy statuses (for backward compatibility)
  pending: { label: '주문완료', color: '#FFA726' },
  paid: { label: '결제완료', color: '#4CAF50' },
  shipping: { label: '배송중', color: '#2196F3' },
  delivered: { label: '배송완료', color: '#757575' },
  cancelled: { label: '취소/환불', color: '#F44336' },

  // New schema statuses
  pending_payment: { label: '결제대기', color: '#FFA726' },
  payment_completed: { label: '결제완료', color: '#4CAF50' },
  preparing: { label: '상품준비중', color: '#2196F3' },
  shipped: { label: '배송중', color: '#2196F3' },
  refunded: { label: '환불', color: '#F44336' }
}

export default function OrderCard({ order, onViewDetail }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatPrice = (price) => {
    if (price === undefined || price === null) return '0원'
    return price.toLocaleString() + '원'
  }

  const getProductSummary = () => {
    if (!order.items || order.items.length === 0) return '상품 정보 없음'

    const firstProduct = order.items[0]
    const restCount = order.items.length - 1

    if (restCount > 0) {
      // Legacy format
      const productName = firstProduct.product_name || `상품 ${firstProduct.product_id}`
      return `${productName} 외 ${restCount}개`
    }
    return firstProduct.product_name || `상품 ${firstProduct.product_id}`
  }

  // Support both old and new schema
  const orderId = order.order_id || order.id
  const orderDate = order.order_created_at || order.order_date
  const orderStatus = order.order_status || order.status
  const orderAmount = order.order_final_amount || order.total_amount
  const orderNumber = order.order_number || orderId

  const statusInfo = STATUS_INFO[orderStatus] || STATUS_INFO.pending

  return (
    <div className="order-card">
      <div className="order-header">
        <div className="order-date-info">
          <span className="order-date">{formatDate(orderDate)}</span>
          <span className="order-number">주문번호: {orderNumber}</span>
        </div>
        <StatusChip status={orderStatus} />
      </div>

      <div className="order-content">
        <div className="order-product-info">
          <span className="product-name">{getProductSummary()}</span>
          <span className="order-amount">{formatPrice(orderAmount)}</span>
        </div>
      </div>

      <div className="order-footer">
        <Button
          variant="secondary"
          onClick={() => onViewDetail(order)}
        >
          상세보기
        </Button>
      </div>
    </div>
  )
}
