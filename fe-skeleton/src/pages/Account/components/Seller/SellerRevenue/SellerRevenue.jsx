import { useState } from 'react';
import PendingSettlement from './PendingSettlement';
import CompletedSettlement from './CompletedSettlement';
import MonthlyReport from './MonthlyReport';
import './SellerRevenue.css';

const SellerRevenue = () => {
  const [activeTab, setActiveTab] = useState('pending'); // pending, completed, report

  return (
    <div className="account-section">
      <div className="seller-revenue">
        <div className="seller-revenue-header">
          <h2>정산 관리</h2>
          <p className="subtitle">판매 수익 및 정산 내역을 관리합니다</p>
        </div>

      <div className="revenue-tabs">
        <button
          className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          정산 대기
        </button>
        <button
          className={`tab-button ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          정산 완료
        </button>
        <button
          className={`tab-button ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
        >
          월별 리포트
        </button>
      </div>

      <div className="revenue-content">
        {activeTab === 'pending' && <PendingSettlement />}
        {activeTab === 'completed' && <CompletedSettlement />}
        {activeTab === 'report' && <MonthlyReport />}
      </div>
      </div>
    </div>
  );
};

export default SellerRevenue;