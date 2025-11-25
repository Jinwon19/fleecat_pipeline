import { useState, useEffect } from "react";
import { ProductCard } from "../../../components/ProductCard/ProductCard";
import "./ProductSection.css";

export function ProductSection() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/v1/products');
        if (!response.ok) {
          throw new Error('상품을 불러오는데 실패했습니다');
        }
        const data = await response.json();

        // DB 데이터를 컴포넌트 형식에 맞게 변환
        const formattedProducts = data.map(product => ({
          id: product.product_id,
          name: product.product_name,
          price: product.product_price,
          image: product.product_img?.[0]?.product_img_url || '/default-image.jpg',
          discount: null,
          originalPrice: null,
          isLiked: false
        }));

        setProducts(formattedProducts);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <section className="products-section">
        <div className="products-container">
          <h2 className="products-title">추천 상품</h2>
          <p>상품을 불러오는 중...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="products-section">
        <div className="products-container">
          <h2 className="products-title">추천 상품</h2>
          <p>오류: {error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="products-section">
      <div className="products-container">
        <h2 className="products-title">추천 상품</h2>

        <div className="products-grid">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              variant="link"
            />
          ))}
        </div>

        {/* More Products Button */}
        <div className="products-more-section">
          <button className="products-more-btn">
            더 많은 상품 보기
          </button>
        </div>
      </div>
    </section>
  );
}
