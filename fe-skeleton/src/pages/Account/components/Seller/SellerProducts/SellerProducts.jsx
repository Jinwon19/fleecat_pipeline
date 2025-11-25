import { useState, useMemo } from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
import Button from '../../../../../components/common/Button';
import Select from '../../../../../components/common/Select';
import ProductFilters from './ProductFilters';
import ProductTable from './ProductTable';
import Pagination from './Pagination';
import ProductForm from './ProductForm';
import { mockProducts, categories, statusOptions, sortOptions } from './mockData';
import toast from '../../../../../lib/toast';
import './SellerProducts.css';

export default function SellerProducts() {
  const [products, setProducts] = useState(mockProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const itemsPerPage = 10;

  // 필터링 & 정렬
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // 검색
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 카테고리 필터
    if (categoryFilter) {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    // 상태 필터
    if (statusFilter) {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // 정렬
    switch (sortBy) {
      case 'latest':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'priceHigh':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'priceLow':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'stock':
        filtered.sort((a, b) => b.stock - a.stock);
        break;
      default:
        break;
    }

    return filtered;
  }, [products, searchQuery, categoryFilter, statusFilter, sortBy]);

  // 페이지네이션
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredProducts.slice(start, end);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // 페이지 변경 시 스크롤 맨 위로
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 전체 선택
  const handleSelectAll = () => {
    if (selectedIds.length === paginatedProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedProducts.map(p => p.id));
    }
  };

  // 개별 선택
  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // 상품 등록
  const handleCreate = (formData) => {
    const newProduct = {
      ...formData,
      id: Math.max(...products.map(p => p.id)) + 1,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setProducts([newProduct, ...products]);
    toast.success('상품이 등록되었습니다');
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  // 상품 수정
  const handleUpdate = (formData) => {
    setProducts(products.map(p =>
      p.id === formData.id ? { ...p, ...formData } : p
    ));
    toast.success('상품이 수정되었습니다');
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  // 상품 수정 시작
  const handleEdit = (product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  // 상품 삭제
  const handleDelete = (id) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      setProducts(products.filter(p => p.id !== id));
      setSelectedIds(selectedIds.filter(sid => sid !== id));
      toast.success('상품이 삭제되었습니다');
    }
  };

  // 일괄 삭제
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) {
      toast.error('삭제할 상품을 선택하세요');
      return;
    }

    if (window.confirm(`선택한 ${selectedIds.length}개 상품을 삭제하시겠습니까?`)) {
      setProducts(products.filter(p => !selectedIds.includes(p.id)));
      setSelectedIds([]);
      toast.success('선택한 상품이 삭제되었습니다');
    }
  };

  // 일괄 상태 변경
  const handleBulkStatusChange = (status) => {
    if (selectedIds.length === 0) {
      toast.error('상품을 선택하세요');
      return;
    }

    setProducts(products.map(p =>
      selectedIds.includes(p.id) ? { ...p, status } : p
    ));
    setSelectedIds([]);
    
    const statusLabel = status === 'active' ? '판매중' : status === 'soldout' ? '품절' : '비공개';
    toast.success(`선택한 상품을 ${statusLabel}으로 변경했습니다`);
  };

  // 폼 닫기
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  return (
    <div className="account-section">
      <div className="seller-products">
        {/* 헤더 */}
        <div className="products-header">
          <div>
            <h2 className="section-title">상품 관리</h2>
            <p className="section-subtitle">
              총 {filteredProducts.length}개 상품
              {selectedIds.length > 0 && ` · ${selectedIds.length}개 선택됨`}
            </p>
          </div>

          <Button onClick={() => setIsFormOpen(true)}>
            <Plus size={18} />
            상품 등록
          </Button>
        </div>

      {/* 필터 & 정렬 */}
      <div className="products-controls">
        <ProductFilters
          searchQuery={searchQuery}
          category={categoryFilter}
          status={statusFilter}
          onSearchChange={setSearchQuery}
          onCategoryChange={setCategoryFilter}
          onStatusChange={setStatusFilter}
          categories={categories}
          statusOptions={statusOptions}
        />

        <Select
          options={sortOptions}
          value={sortBy}
          onChange={setSortBy}
        />
      </div>

      {/* 일괄 관리 버튼 */}
      {selectedIds.length > 0 && (
        <div className="bulk-actions">
          <span className="bulk-label">
            {selectedIds.length}개 선택됨
          </span>
          <div className="bulk-buttons">
            <Button
              size="small"
              variant="secondary"
              onClick={() => handleBulkStatusChange('active')}
            >
              판매중으로 변경
            </Button>
            <Button
              size="small"
              variant="secondary"
              onClick={() => handleBulkStatusChange('inactive')}
            >
              비공개로 변경
            </Button>
            <Button
              size="small"
              variant="danger"
              onClick={handleBulkDelete}
            >
              <Trash2 size={16} />
              선택 삭제
            </Button>
          </div>
        </div>
      )}

      {/* 상품 테이블 */}
      <ProductTable
        products={paginatedProducts}
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onSelectOne={handleSelectOne}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {/* 상품 등록/수정 폼 */}
      <ProductForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={editingProduct ? handleUpdate : handleCreate}
        initialData={editingProduct}
      />
      </div>
    </div>
  );
}