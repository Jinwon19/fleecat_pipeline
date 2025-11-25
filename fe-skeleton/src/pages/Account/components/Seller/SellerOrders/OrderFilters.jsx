import { Search } from 'lucide-react';
import Select from '../../../../../components/common/Select';
import './OrderFilters.css';

export default function OrderFilters({
  searchQuery,
  status,
  period,
  onSearchChange,
  onStatusChange,
  onPeriodChange,
  statusOptions,
  periodOptions
}) {
  return (
    <div className="order-filters">
      {/* 검색 */}
      <div className="filter-search">
        <Search size={20} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="주문번호, 구매자명 검색"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* 기간 필터 */}
      <div className="period-filter">
        {periodOptions.map((option) => (
          <button
            key={option.value}
            className={`period-btn ${period === option.value ? 'active' : ''}`}
            onClick={() => onPeriodChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* 상태 필터 */}
      <Select
        options={statusOptions}
        value={status}
        onChange={onStatusChange}
        placeholder="상태"
      />
    </div>
  );
}
