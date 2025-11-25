import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, MapPin, Heart, Edit } from 'lucide-react';
import './QuickMenu.css';

const QuickMenu = () => {
  const navigate = useNavigate();

  const menuItems = [
    {
      id: 'orders',
      icon: Package,
      label: '주문내역',
      onClick: () => navigate('/account?tab=orders')
    },
    {
      id: 'addresses',
      icon: MapPin,
      label: '배송지',
      onClick: () => navigate('/account?tab=addresses')
    },
    {
      id: 'wishlist',
      icon: Heart,
      label: '찜한상품',
      onClick: () => navigate('/wishlist')
    },
    {
      id: 'reviews',
      icon: Edit,
      label: '리뷰작성',
      onClick: () => navigate('/account?tab=orders&action=review')
    }
  ];

  return (
    <section className="quick-menu" role="region" aria-label="빠른 메뉴">
      <h3 className="quick-menu-title">빠른 메뉴</h3>
      <div className="quick-menu-grid">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className="quick-menu-item"
              onClick={item.onClick}
              aria-label={`${item.label} 페이지로 이동`}
            >
              <div className="menu-icon" aria-hidden="true">
                <Icon size={24} />
              </div>
              <span className="menu-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default QuickMenu;
