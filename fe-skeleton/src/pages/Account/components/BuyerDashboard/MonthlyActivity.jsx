import React from 'react';
import { ShoppingBag, DollarSign, Star, Gift } from 'lucide-react';
import './MonthlyActivity.css';

const MonthlyActivity = ({ activity }) => {
  const activityItems = [
    {
      icon: ShoppingBag,
      label: '주문 횟수',
      value: `${activity.order_count}회`,
      color: '#3b82f6'
    },
    {
      icon: DollarSign,
      label: '구매 금액',
      value: `${activity.total_amount.toLocaleString()}원`,
      color: '#10b981'
    },
    {
      icon: Star,
      label: '작성한 리뷰',
      value: `${activity.review_count}개`,
      color: '#f59e0b'
    },
    {
      icon: Gift,
      label: '적립 포인트',
      value: `${activity.earned_points.toLocaleString()}P`,
      color: '#8b5cf6'
    }
  ];

  return (
    <div className="monthly-activity">
      <h3 className="activity-title">이번 달 활동</h3>
      <div className="activity-grid">
        {activityItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className="activity-item">
              <div className="activity-icon" style={{ background: item.color }}>
                <Icon size={20} color="white" />
              </div>
              <div className="activity-info">
                <span className="activity-label">{item.label}</span>
                <span className="activity-value">{item.value}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthlyActivity;
