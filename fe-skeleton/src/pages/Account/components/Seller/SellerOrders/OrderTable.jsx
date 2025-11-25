import { Eye } from 'lucide-react';
import Badge from '../../../../../components/common/Badge';
import Button from '../../../../../components/common/Button';
import './OrderTable.css';

export default function OrderTable({ orders, onViewDetail }) {
  const getStatusBadge = (status) => {
    const statusMap = {
      paid: { variant: 'info', label: '결제완료' },
      preparing: { variant: 'warning', label: '상품준비중' },
      shipping: { variant: 'info', label: '배송중' },
      delivered: { variant: 'success', label: '배송완료' },
      cancelled: { variant: 'danger', label: '취소/환불' }
    };

    const config = statusMap[status] || statusMap.paid;
    return <Badge variant={config.variant} size="small">{config.label}</Badge>;
  };

  const formatCurrency = (amount) => {
    return amount.toLocaleString('ko-KR') + '원';
  };

  const formatDateTime = (dateTime) => {
    return dateTime.replace(' ', '\n');
  };

  const getProductsDisplay = (products) => {
    if (products.length === 1) {
      return products[0].name;
    }
    return `${products[0].name} 외 ${products.length - 1}개`;
  };

  return (
    <>
      {/* 데스크톱 테이블 뷰 */}
      <div className="order-table-wrapper">
        <table className="order-table">
          <thead>
            <tr>
              <th>주문번호</th>
              <th>주문일시</th>
              <th>구매자</th>
              <th>상품명</th>
              <th>금액</th>
              <th>상태</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-row">
                  주문 내역이 없습니다
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td className="order-id">{order.id}</td>
                  <td className="order-date">{formatDateTime(order.orderDate)}</td>
                  <td>{order.customerName}</td>
                  <td className="product-name">{getProductsDisplay(order.products)}</td>
                  <td className="order-amount">{formatCurrency(order.totalAmount)}</td>
                  <td>{getStatusBadge(order.status)}</td>
                  <td>
                    <Button
                      size="small"
                      variant="outline"
                      onClick={() => onViewDetail(order)}
                    >
                      <Eye size={16} />
                      상세
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 모바일 카드 뷰 */}
      <div className="order-cards">
        {orders.length === 0 ? (
          <div className="empty-state">주문 내역이 없습니다</div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="order-card-item">
              <div className="card-header">
                <span className="order-id">{order.id}</span>
                {getStatusBadge(order.status)}
              </div>

              <div className="card-body">
                <div className="card-info">
                  <div className="info-row">
                    <span className="label">주문일시</span>
                    <span className="value">{order.orderDate}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">구매자</span>
                    <span className="value">{order.customerName}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">상품</span>
                    <span className="value">{getProductsDisplay(order.products)}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">금액</span>
                    <span className="value price">{formatCurrency(order.totalAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="card-footer">
                <Button
                  variant="outline"
                  onClick={() => onViewDetail(order)}
                  fullWidth
                >
                  <Eye size={16} />
                  상세보기
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
