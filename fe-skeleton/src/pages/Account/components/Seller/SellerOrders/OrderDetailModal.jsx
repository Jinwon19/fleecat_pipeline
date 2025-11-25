import { useState } from 'react';
import { User, MapPin, CreditCard, Clock, FileText } from 'lucide-react';
import Modal from '../../../../../components/common/Modal';
import Badge from '../../../../../components/common/Badge';
import Button from '../../../../../components/common/Button';
import ShippingForm from './ShippingForm';
import './OrderDetailModal.css';

export default function OrderDetailModal({ 
  isOpen, 
  onClose, 
  order,
  onStatusChange,
  onTrackingUpdate,
  onMemoSave,
  courierOptions
}) {
  const [memo, setMemo] = useState(order?.memo || '');

  if (!order) return null;

  const getStatusBadge = (status) => {
    const statusMap = {
      paid: { variant: 'info', label: '결제완료' },
      preparing: { variant: 'warning', label: '상품준비중' },
      shipping: { variant: 'info', label: '배송중' },
      delivered: { variant: 'success', label: '배송완료' },
      cancelled: { variant: 'danger', label: '취소/환불' }
    };
    const config = statusMap[status] || statusMap.paid;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount) => {
    return amount.toLocaleString('ko-KR') + '원';
  };

  const handleSaveMemo = () => {
    onMemoSave(order.id, memo);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="주문 상세"
      size="large"
    >
      <div className="order-detail-modal">
        {/* 주문 기본 정보 */}
        <div className="detail-section">
          <div className="section-header">
            <h4>주문 정보</h4>
            {getStatusBadge(order.status)}
          </div>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">주문번호</span>
              <span className="info-value order-id">{order.id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">주문일시</span>
              <span className="info-value">{order.orderDate}</span>
            </div>
          </div>
        </div>

        {/* 구매자 정보 */}
        <div className="detail-section">
          <div className="section-header">
            <User size={18} />
            <h4>구매자 정보</h4>
          </div>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">이름</span>
              <span className="info-value">{order.customer.name}</span>
            </div>
            <div className="info-item">
              <span className="info-label">연락처</span>
              <span className="info-value">{order.customer.phone}</span>
            </div>
            <div className="info-item full-width">
              <span className="info-label">이메일</span>
              <span className="info-value">{order.customer.email}</span>
            </div>
          </div>
        </div>

        {/* 배송지 정보 */}
        <div className="detail-section">
          <div className="section-header">
            <MapPin size={18} />
            <h4>배송지 정보</h4>
          </div>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">수령인</span>
              <span className="info-value">{order.shipping.recipient}</span>
            </div>
            <div className="info-item">
              <span className="info-label">연락처</span>
              <span className="info-value">{order.shipping.phone}</span>
            </div>
            <div className="info-item full-width">
              <span className="info-label">주소</span>
              <span className="info-value">{order.shipping.address}</span>
            </div>
            {order.shipping.memo && (
              <div className="info-item full-width">
                <span className="info-label">배송 메모</span>
                <span className="info-value delivery-memo">{order.shipping.memo}</span>
              </div>
            )}
          </div>
        </div>

        {/* 주문 상품 목록 */}
        <div className="detail-section">
          <div className="section-header">
            <h4>주문 상품</h4>
          </div>
          <div className="products-table">
            <table>
              <thead>
                <tr>
                  <th>상품명</th>
                  <th>옵션</th>
                  <th>수량</th>
                  <th>가격</th>
                </tr>
              </thead>
              <tbody>
                {order.products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.option || '-'}</td>
                    <td>{product.quantity}개</td>
                    <td>{formatCurrency(product.price * product.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 결제 정보 */}
        <div className="detail-section">
          <div className="section-header">
            <CreditCard size={18} />
            <h4>결제 정보</h4>
          </div>
          <div className="payment-summary">
            <div className="payment-row">
              <span>상품 금액</span>
              <span>{formatCurrency(order.payment.productAmount)}</span>
            </div>
            <div className="payment-row">
              <span>배송비</span>
              <span>{formatCurrency(order.payment.shippingFee)}</span>
            </div>
            {order.payment.discount > 0 && (
              <div className="payment-row discount">
                <span>할인</span>
                <span>-{formatCurrency(order.payment.discount)}</span>
              </div>
            )}
            <div className="payment-row total">
              <span>최종 결제 금액</span>
              <span>{formatCurrency(order.payment.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* 주문 타임라인 */}
        <div className="detail-section">
          <div className="section-header">
            <Clock size={18} />
            <h4>주문 타임라인</h4>
          </div>
          <div className="timeline">
            {order.timeline.map((event, index) => (
              <div key={index} className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <span className="timeline-label">{event.label}</span>
                  <span className="timeline-time">{event.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 배송 관리 */}
        {order.status !== 'cancelled' && order.status !== 'paid' && (
          <div className="detail-section">
            <ShippingForm
              order={order}
              onStatusChange={onStatusChange}
              onTrackingUpdate={onTrackingUpdate}
              courierOptions={courierOptions}
            />
          </div>
        )}

        {/* 취소/환불 정보 */}
        {order.cancelRequest && (
          <div className="detail-section cancel-section">
            <div className="section-header">
              <h4>취소/환불 정보</h4>
            </div>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">요청일</span>
                <span className="info-value">{order.cancelRequest.requestDate}</span>
              </div>
              <div className="info-item full-width">
                <span className="info-label">사유</span>
                <span className="info-value">{order.cancelRequest.reason}</span>
              </div>
            </div>
          </div>
        )}

        {/* 판매자 메모 */}
        <div className="detail-section">
          <div className="section-header">
            <FileText size={18} />
            <h4>판매자 메모</h4>
          </div>
          <div className="memo-input">
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="판매자 전용 메모를 입력하세요 (구매자에게 보이지 않습니다)"
              rows={4}
            />
            <Button onClick={handleSaveMemo} variant="secondary">
              메모 저장
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
