import React from 'react';
import './WelcomeSection.css';

const WelcomeSection = ({ user }) => {
  return (
    <div className="welcome-section">
      <div className="welcome-content">
        <h2 className="welcome-title">
          👤 {user.nickname}님, 안녕하세요!
        </h2>
        <div className="user-info">
          <span className="user-grade">회원등급: {user.grade}</span>
          <span className="divider">|</span>
          <span className="user-points">포인트: {user.points.toLocaleString()}P</span>
        </div>
      </div>
    </div>
  );
};

export default WelcomeSection;
