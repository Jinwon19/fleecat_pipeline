import { forwardRef } from 'react'
import './OrderInvoice.css'

const OrderInvoice = forwardRef(({ order }, ref) => {
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

  // Support both old and new schema
  const orderNumber = order.order_number || order.order_id
  const orderDate = order.order_created_at || order.order_date
  const orderTotalAmount = order.order_total_amount || order.total_amount || 0
  const orderDiscountAmount = order.order_discount_amount || 0
  const orderFinalAmount = order.order_final_amount || order.total_amount || 0

  return (
    <div ref={ref} className="order-invoice">
      <div className="invoice-header">
        <h1>주문 명세서</h1>
        <div className="invoice-meta">
          <p>주문번호: {orderNumber}</p>
          <p>발행일: {formatDate(new Date())}</p>
        </div>
      </div>

      {/* Shipping Information */}
      {order.shipping_address && (
        <section className="invoice-section">
          <h2>배송 정보</h2>
          <div className="invoice-info">
            <p>받는 분: {order.shipping_address.recipient_name}</p>
            <p>연락처: {order.shipping_address.phone}</p>
            <p>주소: {order.shipping_address.address}</p>
          </div>
        </section>
      )}

      {/* Order Items */}
      <section className="invoice-section">
        <h2>주문 상품</h2>
        <table className="invoice-table">
          <thead>
            <tr>
              <th>상품명</th>
              <th>단가</th>
              <th>수량</th>
              <th>금액</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item) => (
              <tr key={item.order_item_id}>
                <td>{item.product_name}</td>
                <td>{formatPrice(item.order_item_price)}</td>
                <td>{item.order_item_quantity}개</td>
                <td>{formatPrice(item.order_item_final_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Payment Information */}
      <section className="invoice-section">
        <h2>결제 정보</h2>
        <table className="invoice-summary">
          <tbody>
            <tr>
              <th>상품 금액</th>
              <td>{formatPrice(orderTotalAmount)}</td>
            </tr>
            {orderDiscountAmount > 0 && (
              <tr>
                <th>할인 금액</th>
                <td>-{formatPrice(orderDiscountAmount)}</td>
              </tr>
            )}
            <tr className="total">
              <th>최종 결제 금액</th>
              <td>{formatPrice(orderFinalAmount)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <div className="invoice-footer">
        <p>감사합니다.</p>
        <p className="company-name">FleeCat</p>
      </div>
    </div>
  )
})

OrderInvoice.displayName = 'OrderInvoice'
export default OrderInvoice
