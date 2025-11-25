import './WishlistSkeleton.css'

export default function WishlistSkeleton({ count = 10 }) {
  return (
    <div className="wishlist-grid">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="wishlist-skeleton">
          <div className="wishlist-skeleton__image" />
          <div className="wishlist-skeleton__info">
            <div className="wishlist-skeleton__brand" />
            <div className="wishlist-skeleton__name" />
            <div className="wishlist-skeleton__price" />
          </div>
        </div>
      ))}
    </div>
  )
}
