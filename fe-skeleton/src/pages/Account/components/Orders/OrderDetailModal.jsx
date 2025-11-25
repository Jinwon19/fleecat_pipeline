import { useEffect, useRef } from 'react'
import { X, Printer } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import StatusChip from '../../../../components/common/StatusChip'
import OrderInvoice from '../../../../components/OrderInvoice'
import Button from '../../../../components/common/Button'
import './OrderDetailModal.css'

const SHIPPING_STATUS_LABEL = {
  pending: '배송 준비중',
  in_transit: '배송중',
  out_for_delivery: '배송 출발',
  delivered: '배송 완료',
  failed: '배송 실패',
  returned: '반송'
}

export default function OrderDetailModal({ order, onClose }) {
  const modalRef = useRef(null)
  const closeButtonRef = useRef(null)
  const invoiceRef = useRef(null)

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (price) => {
    if (price === undefined || price === null) return '0원'
    return price.toLocaleString() + '원'
  }

  // Print handler
  const handlePrint = useReactToPrint({
    content: () => invoiceRef.current,
    documentTitle: `주문서_${order.order_number || order.order_id}`
  })

  // Focus trap implementation
  useEffect(() => {
    const modal = modalRef.current
    if (!modal) return

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleTab = (e) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    modal.addEventListener('keydown', handleTab)
    closeButtonRef.current?.focus()

    return () => {
      modal.removeEventListener('keydown', handleTab)
    }
  }, [])

  // ESC key handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Support both old and new schema
  const orderId = order.order_id || order.id
  const orderDate = order.order_created_at || order.order_date
  const orderStatus = order.order_status || order.status
  const orderNumber = order.order_number || orderId
  const orderFinalAmount = order.order_final_amount || order.total_amount || 0
  const orderTotalAmount = order.order_total_amount || order.total_amount || 0
  const orderDiscountAmount = order.order_discount_amount || 0

  return (
    <>
      <div
        className="modal-overlay"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div
          ref={modalRef}
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h3 id="modal-title">주문 상세</h3>
            <button
              ref={closeButtonRef}
              className="btn-close-modal"
              onClick={onClose}
              aria-label="닫기"
            >
              <X size={24} />
            </button>
          </div>

          <div className="modal-body">
            {/* Order Info */}
            <div className="detail-section">
              <div className="detail-row">
                <span className="detail-label">주문번호</span>
                <span className="detail-value">{orderNumber}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">주문일자</span>
                <span className="detail-value">{formatDate(orderDate)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">주문상태</span>
                <StatusChip status={orderStatus} />
              </div>
              {order.shipping_tracking_number && (
                <div className="detail-row">
                  <span className="detail-label">운송장번호</span>
                  <span className="detail-value">
                    {order.shipping_company && `${order.shipping_company} `}
                    {order.shipping_tracking_number}
                  </span>
                </div>
              )}
              {order.shipping_status && (
                <div className="detail-row">
                  <span className="detail-label">배송상태</span>
                  <span className="detail-value">
                    {SHIPPING_STATUS_LABEL[order.shipping_status] || order.shipping_status}
                  </span>
                </div>
              )}
            </div>

            {/* Order Timeline */}
            {order.timeline && order.timeline.length > 0 && (
              <div className="detail-section">
                <h4 className="section-title">배송 추적</h4>
                <div className="timeline">
                  {order.timeline.map((item, index) => (
                    <div key={index} className="timeline-item">
                      <div className="timeline-dot"></div>
                      <div className="timeline-content">
                        <span className="timeline-status">{item.status}</span>
                        <span className="timeline-date">{item.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="detail-section">
              <h4 className="section-title">주문 상품</h4>
              <div className="order-items">
                {order.items && order.items.map((item, index) => (
                  <div key={item.order_item_id || index} className="order-item">
                    <div className="item-info">
                      <span className="item-name">
                        {item.product_name || `상품 ${item.product_id}`}
                      </span>
                      <span className="item-quantity">
                        수량: {item.order_item_quantity || item.quantity}개
                      </span>
                    </div>
                    <div className="item-prices">
                      {item.order_item_discount > 0 && (
                        <span className="item-original-price">
                          {formatPrice(item.order_item_price)}
                        </span>
                      )}
                      <span className="item-price">
                        {formatPrice(item.order_item_final_price || item.price)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            {order.shipping_address && (
              <div className="detail-section">
                <h4 className="section-title">배송지 정보</h4>
                <div className="address-info">
                  <div className="address-row">
                    <span className="address-label">수령인</span>
                    <span className="address-value">{order.shipping_address.recipient_name}</span>
                  </div>
                  <div className="address-row">
                    <span className="address-label">연락처</span>
                    <span className="address-value">{order.shipping_address.phone}</span>
                  </div>
                  <div className="address-row">
                    <span className="address-label">주소</span>
                    <span className="address-value">{order.shipping_address.address}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Info */}
            <div className="detail-section">
              <h4 className="section-title">결제 정보</h4>
              <div className="payment-info">
                {order.payment && (
                  <div className="payment-row">
                    <span className="payment-label">결제 수단</span>
                    <span className="payment-value">{order.payment.method}</span>
                  </div>
                )}
                <div className="payment-row">
                  <span className="payment-label">상품 금액</span>
                  <span className="payment-value">{formatPrice(orderTotalAmount)}</span>
                </div>
                {orderDiscountAmount > 0 && (
                  <div className="payment-row discount">
                    <span className="payment-label">할인 금액</span>
                    <span className="payment-value">-{formatPrice(orderDiscountAmount)}</span>
                  </div>
                )}
                <div className="payment-row total">
                  <span className="payment-label">총 결제 금액</span>
                  <span className="payment-value total-amount">
                    {formatPrice(order.payment?.amount || orderFinalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer with Print Button */}
          <div className="modal-footer">
            <Button
              variant="secondary"
              onClick={handlePrint}
              className="btn-print"
            >
              <Printer size={18} />
              <span>인쇄</span>
            </Button>
            <Button
              variant="secondary"
              onClick={onClose}
            >
              닫기
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden invoice for printing */}
      <div style={{ display: 'none' }}>
        <OrderInvoice ref={invoiceRef} order={order} />
      </div>
    </>
  )
}
