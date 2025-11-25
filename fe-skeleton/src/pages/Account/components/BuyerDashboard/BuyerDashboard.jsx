import React, { useState, useEffect } from 'react';
import WelcomeSection from './WelcomeSection';
import OrderStatusCards from './OrderStatusCards';
import RecentOrders from './RecentOrders';
import QuickMenu from './QuickMenu';
import MonthlyActivity from './MonthlyActivity';
import Benefits from './Benefits';
import SkeletonList from '../../../../components/SkeletonList/SkeletonList';
import ErrorState from '../../../../components/ErrorState/ErrorState';
import { mockDashboardData } from './mockData';
import './BuyerDashboard.css';

const BuyerDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // 데이터 로딩 시뮬레이션
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 실제 API 호출 대신 mock 데이터 사용 (1초 지연)
        await new Promise(resolve => setTimeout(resolve, 1000));
        setData(mockDashboardData);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    // 재시도 로직
    setTimeout(() => {
      setData(mockDashboardData);
      setIsLoading(false);
    }, 1000);
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="buyer-dashboard">
        <div className="dashboard-container">
          <SkeletonList count={1} height="100px" variant="card" />
          <SkeletonList count={4} height="120px" variant="card" />
          <SkeletonList count={3} height="150px" variant="list" />
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="buyer-dashboard">
        <div className="dashboard-container">
          <ErrorState
            title="데이터를 불러올 수 없습니다"
            message="대시보드 정보를 불러오는 중 문제가 발생했습니다."
            onRetry={handleRetry}
            variant="server"
          />
        </div>
      </div>
    );
  }

  // 정상 데이터 렌더링
  const {
    user,
    orderSummary,
    recentOrders,
    monthlyActivity,
    benefits
  } = data || {};

  return (
    <div className="buyer-dashboard">
      <div className="dashboard-container">
        {/* Welcome Section */}
        <WelcomeSection user={user} />

        {/* Order Status Cards */}
        <section className="order-status-section">
          <h3 className="section-title">주문/배송 현황</h3>
          <OrderStatusCards orderSummary={orderSummary} />
        </section>

        {/* Recent Orders */}
        <RecentOrders orders={recentOrders} />

        {/* Quick Menu - 필수 */}
        <QuickMenu />

        {/* Monthly Activity - 선택 */}
        {monthlyActivity && <MonthlyActivity activity={monthlyActivity} />}

        {/* Benefits - 선택 */}
        {benefits && <Benefits benefits={benefits} />}
      </div>
    </div>
  );
};

export default BuyerDashboard;
