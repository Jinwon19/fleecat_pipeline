import { pendingSettlement } from './mockData';
import './PendingSettlement.css';

const PendingSettlement = () => {
  const { totalAmount, expectedDate, orderCount, orders } = pendingSettlement;

  // 합계 계산
  const totals = orders.reduce(
    (acc, order) => ({
      sales: acc.sales + order.salesAmount,
      fee: acc.fee + order.fee,
      net: acc.net + order.netAmount
    }),
    { sales: 0, fee: 0, net: 0 }
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const formatDate = (dateStr) => {
    return dateStr;
  };

  return (
    <div className="pending-settlement">
      {/* 정산 대기 금액 카드 */}
      <div className="pending-summary-card">
        <div className="summary-header">
          <div className="summary-icon">💰</div>
          <div className="summary-info">
            <h3>정산 대기 금액</h3>
            <div className="summary-amount">{formatCurrency(totalAmount)}</div>
          </div>
        </div>
        <div className="summary-details">
          <div className="detail-item">
            <span className="detail-label">정산 예정일</span>
            <span className="detail-value">{expectedDate}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">주문 건수</span>
            <span className="detail-value">{orderCount}건</span>
          </div>
        </div>
      </div>

      {/* 정산 대기 주문 목록 */}
      <div className="pending-orders-section">
        <h3 className="section-title">정산 대기 주문 목록</h3>
        
        <div className="table-container">
          <table className="pending-orders-table">
            <thead>
              <tr>
                <th>주문번호</th>
                <th>주문일</th>
                <th>상품명</th>
                <th>판매 금액</th>
                <th>수수료 (10%)</th>
                <th>실수령액</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderId}>
                  <td className="order-id">{order.orderId}</td>
                  <td>{formatDate(order.orderDate)}</td>
                  <td className="product-name">{order.productName}</td>
                  <td className="amount">{formatCurrency(order.salesAmount)}</td>
                  <td className="fee">-{formatCurrency(order.fee)}</td>
                  <td className="net-amount">{formatCurrency(order.netAmount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td colSpan="3"><strong>합계</strong></td>
                <td className="amount"><strong>{formatCurrency(totals.sales)}</strong></td>
                <td className="fee"><strong>-{formatCurrency(totals.fee)}</strong></td>
                <td className="net-amount"><strong>{formatCurrency(totals.net)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 모바일 카드 뷰 */}
        <div className="pending-orders-mobile">
          {orders.map((order) => (
            <div key={order.orderId} className="order-card">
              <div className="order-card-header">
                <span className="order-id">{order.orderId}</span>
                <span className="order-date">{formatDate(order.orderDate)}</span>
              </div>
              <div className="order-card-body">
                <div className="product-name">{order.productName}</div>
                <div className="order-amounts">
                  <div className="amount-row">
                    <span className="label">판매 금액</span>
                    <span className="value">{formatCurrency(order.salesAmount)}</span>
                  </div>
                  <div className="amount-row fee">
                    <span className="label">수수료 (10%)</span>
                    <span className="value">-{formatCurrency(order.fee)}</span>
                  </div>
                  <div className="amount-row net">
                    <span className="label">실수령액</span>
                    <span className="value">{formatCurrency(order.netAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* 모바일 합계 */}
          <div className="mobile-total">
            <div className="total-row">
              <span className="label">판매 금액 합계</span>
              <span className="value">{formatCurrency(totals.sales)}</span>
            </div>
            <div className="total-row">
              <span className="label">수수료 합계</span>
              <span className="value">-{formatCurrency(totals.fee)}</span>
            </div>
            <div className="total-row net">
              <span className="label">실수령액 합계</span>
              <span className="value">{formatCurrency(totals.net)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="info-message">
        <span className="info-icon">ℹ️</span>
        <p>정산은 매월 1일, 15일에 진행되며, 정산 완료 후 영업일 기준 3일 이내에 입금됩니다.</p>
      </div>
    </div>
  );
};

export default PendingSettlement;
