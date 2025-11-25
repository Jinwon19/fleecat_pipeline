import React from 'react';
import { useNavigate } from 'react-router-dom';
import './OrderStatusCards.css';

const OrderStatusCards = ({ orderSummary }) => {
  const navigate = useNavigate();

  const statusItems = [
    {
      key: 'payment_completed',
      label: '결제완료',
      count: orderSummary.payment_completed,
      color: '#3b82f6'
    },
    {
      key: 'preparing',
      label: '배송준비중',
      count: orderSummary.preparing,
      color: '#f59e0b'
    },
    {
      key: 'shipping',
      label: '배송중',
      count: orderSummary.shipping,
      color: '#8b5cf6'
    },
    {
      key: 'delivered',
      label: '배송완료',
      count: orderSummary.delivered,
      color: '#10b981'
    }
  ];

  const handleCardClick = (status) => {
    // 주문 내역 페이지로 이동 (해당 상태 필터링)
    navigate('/account?tab=orders&status=' + status);
  };

  const handleKeyDown = (e, status) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick(status);
    }
  };

  return (
    <div className="order-status-cards">
      {statusItems.map((item) => (
        <div
          key={item.key}
          className="status-card"
          onClick={() => handleCardClick(item.key)}
          onKeyDown={(e) => handleKeyDown(e, item.key)}
          style={{ borderTopColor: item.color }}
          role="button"
          tabIndex={0}
          aria-label={`${item.label} ${item.count}건 조회`}
        >
          <div className="status-label">{item.label}</div>
          <div className="status-count" aria-hidden="true">{item.count}</div>
        </div>
      ))}
    </div>
  );
};

export default OrderStatusCards;
