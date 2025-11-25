import { Edit2, Trash2 } from 'lucide-react';
import Badge from '../../../../../components/common/Badge';
import './ProductTable.css';

export default function ProductTable({
  products,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onEdit,
  onDelete
}) {
  const allSelected = products.length > 0 && selectedIds.length === products.length;

  const getStatusBadge = (status) => {
    const statusMap = {
      active: { variant: 'success', label: '판매중' },
      soldout: { variant: 'danger', label: '품절' },
      inactive: { variant: 'default', label: '비공개' }
    };

    const config = statusMap[status] || statusMap.inactive;
    return <Badge variant={config.variant} size="small">{config.label}</Badge>;
  };

  const formatPrice = (price) => {
    return price.toLocaleString('ko-KR') + '원';
  };

  return (
    <>
      {/* 데스크톱 테이블 뷰 */}
      <div className="product-table-wrapper">
        <table className="product-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                />
              </th>
              <th>썸네일</th>
              <th>상품명</th>
              <th>카테고리</th>
              <th>가격</th>
              <th>재고</th>
              <th>상태</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-row">
                  등록된 상품이 없습니다
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(product.id)}
                      onChange={() => onSelectOne(product.id)}
                    />
                  </td>
                  <td>
                    <img
                      src={product.thumbnail}
                      alt={product.name}
                      className="product-thumbnail"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/images/logo_v3.png';
                      }}
                    />
                  </td>
                  <td className="product-name">{product.name}</td>
                  <td>{product.category}</td>
                  <td className="product-price">{formatPrice(product.price)}</td>
                  <td className={product.stock === 0 ? 'stock-zero' : ''}>
                    {product.stock}개
                  </td>
                  <td>{getStatusBadge(product.status)}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-action btn-edit"
                        onClick={() => onEdit(product)}
                        title="수정"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-action btn-delete"
                        onClick={() => onDelete(product.id)}
                        title="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 모바일 카드 뷰 */}
      <div className="product-cards">
        {products.length === 0 ? (
          <div className="empty-state">등록된 상품이 없습니다</div>
        ) : (
          products.map((product) => (
            <div key={product.id} className="product-card-item">
              <div className="card-header">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(product.id)}
                  onChange={() => onSelectOne(product.id)}
                />
                {getStatusBadge(product.status)}
              </div>

              <div className="card-body">
                <img
                  src={product.thumbnail}
                  alt={product.name}
                  className="card-thumbnail"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/images/logo_v3.png';
                  }}
                />
                <div className="card-info">
                  <h4 className="card-title">{product.name}</h4>
                  <p className="card-category">{product.category}</p>
                  <p className="card-price">{formatPrice(product.price)}</p>
                  <p className={`card-stock ${product.stock === 0 ? 'zero' : ''}`}>
                    재고: {product.stock}개
                  </p>
                </div>
              </div>

              <div className="card-footer">
                <button
                  className="btn-action btn-edit"
                  onClick={() => onEdit(product)}
                >
                  <Edit2 size={16} />
                  수정
                </button>
                <button
                  className="btn-action btn-delete"
                  onClick={() => onDelete(product.id)}
                >
                  <Trash2 size={16} />
                  삭제
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
