import './RoleSwitcher.css'

export default function RoleSwitcher({ activeMode, onModeChange }) {
  return (
    <div className="role-switcher">
      <button
        className={`role-btn ${activeMode === 'buyer' ? 'role-btn--active' : ''}`}
        onClick={() => onModeChange('buyer')}
      >
        구매자
      </button>
      <button
        className={`role-btn ${activeMode === 'seller' ? 'role-btn--active' : ''}`}
        onClick={() => onModeChange('seller')}
      >
        판매자
      </button>
    </div>
  )
}
