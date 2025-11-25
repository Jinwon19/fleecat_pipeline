// SellerDashboard Mock Data

export const dashboardStats = {
  todaySales: { 
    value: 1250000, 
    change: 5.2,
    label: '오늘 판매액'
  },
  orderCount: { 
    value: 47, 
    change: -2.1,
    label: '주문 건수'
  },
  visitors: { 
    value: 1234, 
    change: 12.3,
    label: '방문자 수'
  },
  conversionRate: { 
    value: 3.8, 
    change: 0.5,
    label: '전환율'
  }
};

export const salesData = {
  daily: [
    { date: '10/02', sales: 350000 },
    { date: '10/03', sales: 420000 },
    { date: '10/04', sales: 380000 },
    { date: '10/05', sales: 520000 },
    { date: '10/06', sales: 490000 },
    { date: '10/07', sales: 610000 },
    { date: '10/08', sales: 580000 }
  ],
  weekly: [
    { week: 'Week 1', sales: 2100000 },
    { week: 'Week 2', sales: 2450000 },
    { week: 'Week 3', sales: 2850000 },
    { week: 'Week 4', sales: 3200000 }
  ],
  monthly: [
    { month: 'Jan', sales: 8500000 },
    { month: 'Feb', sales: 9200000 },
    { month: 'Mar', sales: 8800000 },
    { month: 'Apr', sales: 9500000 },
    { month: 'May', sales: 10200000 },
    { month: 'Jun', sales: 11000000 },
    { month: 'Jul', sales: 10800000 },
    { month: 'Aug', sales: 11500000 },
    { month: 'Sep', sales: 12000000 },
    { month: 'Oct', sales: 12500000 },
    { month: 'Nov', sales: 13200000 },
    { month: 'Dec', sales: 15000000 }
  ]
};

export const topProducts = [
  {
    rank: 1,
    id: 1,
    name: '프리미엄 무선 이어폰',
    thumbnail: '/images/7. AirPods.png',
    salesCount: 234,
    revenue: 23400000
  },
  {
    rank: 2,
    id: 2,
    name: '스마트 헤어 드라이어',
    thumbnail: '/images/8. Hair dryer.png',
    salesCount: 189,
    revenue: 18900000
  },
  {
    rank: 3,
    id: 3,
    name: '디지털 노트북',
    thumbnail: '/images/9.digital.png',
    salesCount: 156,
    revenue: 15600000
  },
  {
    rank: 4,
    id: 4,
    name: '프리미엄 핸드백',
    thumbnail: '/images/2. bag.png',
    salesCount: 143,
    revenue: 14300000
  },
  {
    rank: 5,
    id: 5,
    name: '패션 악세서리 세트',
    thumbnail: '/images/1. Accessories.png',
    salesCount: 128,
    revenue: 12800000
  }
];
