import './TopProducts.css';

export default function TopProducts({ products }) {
  const formatCurrency = (value) => {
    return value.toLocaleString('ko-KR') + '원';
  };

  return (
    <div className="top-products-container">
      <div className="top-products-header">
        <h3>인기 상품 TOP 5</h3>
      </div>

      {/* 데스크톱 테이블 뷰 */}
      <div className="top-products-table">
        <table>
          <thead>
            <tr>
              <th>순위</th>
              <th>상품</th>
              <th>판매량</th>
              <th>매출액</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <div className={`rank-badge rank-${product.rank}`}>
                    {product.rank}
                  </div>
                </td>
                <td>
                  <div className="product-info">
                    <img 
                      src={product.thumbnail} 
                      alt={product.name}
                      onError={(e) => {
                        e.target.onerror = null; // 무한 루프 방지
                        e.target.src = '/images/logo_v3.png';
                      }}
                    />
                    <span>{product.name}</span>
                  </div>
                </td>
                <td className="sales-count">{product.salesCount}개</td>
                <td className="revenue">{formatCurrency(product.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 모바일 카드 뷰 */}
      <div className="top-products-cards">
        {products.map((product) => (
          <div key={product.id} className="product-card">
            <div className="product-card-header">
              <div className={`rank-badge rank-${product.rank}`}>
                {product.rank}
              </div>
              <img 
                src={product.thumbnail} 
                alt={product.name}
                onError={(e) => {
                  e.target.onerror = null; // 무한 루프 방지
                  e.target.src = '/images/logo_v3.png';
                }}
              />
            </div>
            <div className="product-card-body">
              <h4>{product.name}</h4>
              <div className="product-stats">
                <div className="stat">
                  <span className="label">판매량</span>
                  <span className="value">{product.salesCount}개</span>
                </div>
                <div className="stat">
                  <span className="label">매출액</span>
                  <span className="value">{formatCurrency(product.revenue)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
