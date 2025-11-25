export const mockDashboardData = {
  // 사용자 정보
  user: {
    nickname: "홍길동",
    grade: "일반회원",
    points: 1250
  },

  // 주문 현황 집계
  orderSummary: {
    payment_completed: 2,
    preparing: 1,
    shipping: 3,
    delivered: 5
  },

  // 최근 주문 (3개)
  recentOrders: [
    {
      order_id: "ORD-12345",
      product_name: "무선 이어폰 Pro",
      product_image: "/images/products/earphone.jpg",
      status: "배송중",
      order_date: "2024-01-15",
      total_amount: 45000
    },
    {
      order_id: "ORD-12344",
      product_name: "스마트 워치",
      product_image: "/images/products/watch.jpg",
      status: "배송완료",
      order_date: "2024-01-12",
      total_amount: 89000
    },
    {
      order_id: "ORD-12343",
      product_name: "노트북 거치대",
      product_image: "/images/products/stand.jpg",
      status: "배송완료",
      order_date: "2024-01-10",
      total_amount: 25000
    }
  ],

  // 이번 달 활동 (선택적)
  monthlyActivity: {
    order_count: 5,
    total_amount: 250000,
    review_count: 2,
    earned_points: 2500
  },

  // 혜택/알림 (선택적)
  benefits: {
    availableCoupons: 3,
    expiringPoints: 500,
    expiryDate: '2024.01.31'
  }
};
