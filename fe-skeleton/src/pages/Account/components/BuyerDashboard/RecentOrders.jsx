import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ShoppingBag } from 'lucide-react';
import EmptyState from '../../../../components/EmptyState/EmptyState';
import './RecentOrders.css';

const RecentOrders = ({ orders }) => {
  const navigate = useNavigate();

  const handleViewAll = () => {
    navigate('/account?tab=orders');
  };

  const handleOrderClick = (orderId) => {
    navigate(`/account?tab=orders&order=${orderId}`);
  };

  return (
    <div className="recent-orders">
      <div className="recent-orders-header">
        <h3>최근 주문 내역</h3>
        <button className="view-all-btn" onClick={handleViewAll}>
          전체 보기 <ChevronRight size={16} />
        </button>
      </div>

      <div className="orders-list">
        {orders.length === 0 ? (
          <EmptyState
            title="주문 내역이 없습니다"
            message="아직 주문하신 상품이 없습니다. 상품을 둘러보고 첫 주문을 시작해보세요!"
            icon={<ShoppingBag size={48} strokeWidth={1.5} />}
            action={{
              label: '상품 둘러보기',
              onClick: () => navigate('/products')
            }}
          />
        ) : (
          orders.map((order) => (
            <div
              key={order.order_id}
              className="order-item"
              onClick={() => handleOrderClick(order.order_id)}
            >
              <img
                src={order.product_image}
                alt={order.product_name}
                className="order-image"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23f0f0f0" width="80" height="80"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" dy="45" dx="15"%3ENo Image%3C/text%3E%3C/svg%3E';
                }}
              />
              <div className="order-info">
                <h4 className="product-name">{order.product_name}</h4>
                <p className="order-number">주문번호: {order.order_id}</p>
                <div className="order-meta">
                  <span className="order-status">{order.status}</span>
                  <span className="divider">|</span>
                  <span className="order-date">{order.order_date}</span>
                  <span className="divider">|</span>
                  <span className="order-amount">
                    {order.total_amount.toLocaleString()}원
                  </span>
                </div>
              </div>
              <ChevronRight className="arrow-icon" size={20} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecentOrders;
