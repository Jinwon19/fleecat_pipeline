import { useState } from "react";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import "./ProductCard.css";

export function ProductCard({ product, variant = "link", onClick }) {
  const [isLiked, setIsLiked] = useState(product?.isLiked || false);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const handleLike = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsLiked(!isLiked);
  };

  const handleClick = () => {
    if (onClick && variant === "button") {
      onClick(product);
    }
  };

  const cardContent = (
    <div className="product-card">
      {/* Product Image */}
      <div className="product-image-wrapper">
        <img
          src={product.image}
          alt={product.name}
          className="product-image"
        />

        {/* Discount Badge */}
        {product.discount && (
          <div className="product-discount-badge">
            {product.discount}%
          </div>
        )}

        {/* Like Button */}
        <button
          onClick={handleLike}
          className="product-like-btn"
        >
          <Heart
            className={`product-like-icon ${isLiked ? 'liked' : ''}`}
          />
        </button>
      </div>

      {/* Product Info */}
      <div className="product-info">
        <h3 className="product-name">
          {product.name}
        </h3>

        <div className="product-price-wrapper">
          <span className="product-price">
            {formatPrice(product.price)}원
          </span>
          {product.originalPrice && (
            <span className="product-original-price">
              {formatPrice(product.originalPrice)}원
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (variant === "link") {
    return (
      <Link to={`/products/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        {cardContent}
      </Link>
    );
  }

  if (variant === "button") {
    return (
      <div onClick={handleClick} style={{ cursor: 'pointer' }}>
        {cardContent}
      </div>
    );
  }

  return cardContent;
}

export default ProductCard;
