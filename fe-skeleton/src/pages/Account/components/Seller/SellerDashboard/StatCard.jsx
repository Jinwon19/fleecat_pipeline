import { TrendingUp, TrendingDown } from 'lucide-react';
import './StatCard.css';

export default function StatCard({ label, value, change, icon: Icon, format = 'number' }) {
  const isPositive = change >= 0;
  const changeClass = isPositive ? 'positive' : 'negative';

  const formatValue = (val) => {
    if (format === 'currency') {
      return val.toLocaleString('ko-KR') + '원';
    } else if (format === 'percentage') {
      return val + '%';
    } else {
      return val.toLocaleString('ko-KR');
    }
  };

  return (
    <div className="stat-card">
      <div className="stat-header">
        <span className="stat-label">{label}</span>
        {Icon && <Icon className="stat-icon" size={20} />}
      </div>
      
      <div className="stat-value">
        {formatValue(value)}
      </div>

      <div className={`stat-change ${changeClass}`}>
        {isPositive ? (
          <TrendingUp size={16} />
        ) : (
          <TrendingDown size={16} />
        )}
        <span>
          {isPositive ? '+' : ''}{change}%
        </span>
        <span className="stat-change-label">전일 대비</span>
      </div>
    </div>
  );
}
