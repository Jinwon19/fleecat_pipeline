import React from 'react';
import { Ticket, AlertCircle } from 'lucide-react';
import './Benefits.css';

const Benefits = ({ benefits }) => {
  return (
    <div className="benefits">
      <div className="benefit-item coupon">
        <Ticket size={20} className="benefit-icon" />
        <span className="benefit-text">
          사용 가능한 쿠폰 <strong>{benefits?.availableCoupons || 3}장</strong>
        </span>
      </div>

      <div className="benefit-item points-expiry">
        <AlertCircle size={20} className="benefit-icon warning" />
        <span className="benefit-text">
          곧 소멸 예정 포인트: <strong>{benefits?.expiringPoints || 500}P</strong>
          <span className="expiry-date">({benefits?.expiryDate || '2024.01.31'})</span>
        </span>
      </div>
    </div>
  );
};

export default Benefits;
