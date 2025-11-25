import { DollarSign, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatCard from './StatCard';
import SalesChart from './SalesChart';
import TopProducts from './TopProducts';
import { dashboardStats, salesData, topProducts } from './mockData';
import Button from '../../../../../components/common/Button';
import './SellerDashboard.css';

export default function SellerDashboard() {
  const navigate = useNavigate();

  return (
    <div className="account-section">
      <div className="seller-dashboard">
        <div className="dashboard-header">
          <h2 className="section-title">대시보드</h2>
          <div className="quick-actions">
            <Button 
              variant="outline" 
              onClick={() => navigate('/account?tab=seller-orders')}
            >
              주문 확인
            </Button>
            <Button 
              onClick={() => navigate('/account?tab=products')}
            >
              상품 등록
            </Button>
          </div>
        </div>

      {/* 통계 카드 4개 */}
      <div className="stats-grid">
        <StatCard
          label={dashboardStats.todaySales.label}
          value={dashboardStats.todaySales.value}
          change={dashboardStats.todaySales.change}
          icon={DollarSign}
          format="currency"
        />
        <StatCard
          label={dashboardStats.orderCount.label}
          value={dashboardStats.orderCount.value}
          change={dashboardStats.orderCount.change}
          icon={ShoppingCart}
          format="number"
        />
        <StatCard
          label={dashboardStats.visitors.label}
          value={dashboardStats.visitors.value}
          change={dashboardStats.visitors.change}
          icon={Users}
          format="number"
        />
        <StatCard
          label={dashboardStats.conversionRate.label}
          value={dashboardStats.conversionRate.value}
          change={dashboardStats.conversionRate.change}
          icon={TrendingUp}
          format="percentage"
        />
      </div>

      {/* 매출 그래프 */}
      <SalesChart data={salesData} />

      {/* 인기 상품 TOP 5 */}
      <TopProducts products={topProducts} />
      </div>
    </div>
  );
}