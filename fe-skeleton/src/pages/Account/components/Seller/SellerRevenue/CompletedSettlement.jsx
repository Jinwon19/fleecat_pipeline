import { useState } from 'react';
import { completedSettlements } from './mockData';
import Badge from '../../../../../components/common/Badge/Badge';
import './CompletedSettlement.css';

const CompletedSettlement = () => {
  const [settlements] = useState(completedSettlements);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // 페이지네이션
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = settlements.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(settlements.length / itemsPerPage);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const getStatusBadge = (status) => {
    if (status === 'completed') {
      return <Badge variant="success">입금완료</Badge>;
    }
    return <Badge variant="warning">입금대기</Badge>;
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleViewDetail = (settlement) => {
    alert(`정산 ID: ${settlement.id}\n정산 기간: ${settlement.period}\n실수령액: ${formatCurrency(settlement.netAmount)}`);
  };

  return (
    <div className="completed-settlement">
      <div className="settlement-header">
        <h3>정산 완료 내역</h3>
        <p className="subtitle">총 {settlements.length}건의 정산 내역</p>
      </div>

      {/* 테이블 뷰 */}
      <div className="table-container">
        <table className="settlement-table">
          <thead>
            <tr>
              <th>정산일</th>
              <th>정산 기간</th>
              <th>총 매출</th>
              <th>총 수수료</th>
              <th>실수령액</th>
              <th>주문 건수</th>
              <th>입금 상태</th>
              <th>상세</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((settlement) => (
              <tr key={settlement.id}>
                <td className="settlement-date">{settlement.settlementDate}</td>
                <td className="settlement-period">{settlement.period}</td>
                <td className="amount">{formatCurrency(settlement.totalSales)}</td>
                <td className="fee">-{formatCurrency(settlement.totalFee)}</td>
                <td className="net-amount">{formatCurrency(settlement.netAmount)}</td>
                <td className="order-count">{settlement.orderCount}건</td>
                <td className="status">{getStatusBadge(settlement.depositStatus)}</td>
                <td className="actions">
                  <button
                    className="detail-button"
                    onClick={() => handleViewDetail(settlement)}
                  >
                    상세보기
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 모바일 카드 뷰 */}
      <div className="settlement-cards-mobile">
        {currentItems.map((settlement) => (
          <div key={settlement.id} className="settlement-card">
            <div className="card-header">
              <div className="settlement-date">{settlement.settlementDate}</div>
              {getStatusBadge(settlement.depositStatus)}
            </div>
            <div className="card-body">
              <div className="period">{settlement.period}</div>
              <div className="amounts">
                <div className="amount-row">
                  <span className="label">총 매출</span>
                  <span className="value sales">{formatCurrency(settlement.totalSales)}</span>
                </div>
                <div className="amount-row">
                  <span className="label">총 수수료</span>
                  <span className="value fee">-{formatCurrency(settlement.totalFee)}</span>
                </div>
                <div className="amount-row net">
                  <span className="label">실수령액</span>
                  <span className="value">{formatCurrency(settlement.netAmount)}</span>
                </div>
                <div className="amount-row">
                  <span className="label">주문 건수</span>
                  <span className="value">{settlement.orderCount}건</span>
                </div>
              </div>
            </div>
            <div className="card-footer">
              <button
                className="detail-button"
                onClick={() => handleViewDetail(settlement)}
              >
                상세보기
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            이전
          </button>
          
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index + 1}
              className={`page-button ${currentPage === index + 1 ? 'active' : ''}`}
              onClick={() => handlePageChange(index + 1)}
            >
              {index + 1}
            </button>
          ))}
          
          <button
            className="page-button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
};

export default CompletedSettlement;
