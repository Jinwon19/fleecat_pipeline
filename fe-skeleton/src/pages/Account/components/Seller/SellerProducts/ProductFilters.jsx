import { Search } from 'lucide-react';
import Select from '../../../../../components/common/Select';
import './ProductFilters.css';

export default function ProductFilters({
  searchQuery,
  category,
  status,
  onSearchChange,
  onCategoryChange,
  onStatusChange,
  categories,
  statusOptions
}) {
  return (
    <div className="product-filters">
      {/* 검색 */}
      <div className="filter-search">
        <Search size={20} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="상품명 검색"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* 카테고리 필터 */}
      <Select
        options={categories}
        value={category}
        onChange={onCategoryChange}
        placeholder="카테고리"
      />

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
