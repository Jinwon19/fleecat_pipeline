// 정산 대기 Mock 데이터
export const pendingSettlement = {
  totalAmount: 4500000,
  expectedDate: '2025-01-15',
  orderCount: 15,
  orders: [
    {
      orderId: 'ORD-20250108-001',
      orderDate: '2025-01-08',
      productName: '프리미엄 무선 이어폰',
      salesAmount: 89000,
      fee: 8900, // 10%
      netAmount: 80100
    },
    {
      orderId: 'ORD-20250107-045',
      orderDate: '2025-01-07',
      productName: '스마트워치',
      salesAmount: 159000,
      fee: 15900,
      netAmount: 143100
    },
    {
      orderId: 'ORD-20250107-032',
      orderDate: '2025-01-07',
      productName: '노트북 스탠드',
      salesAmount: 35000,
      fee: 3500,
      netAmount: 31500
    },
    {
      orderId: 'ORD-20250106-078',
      orderDate: '2025-01-06',
      productName: '기계식 키보드',
      salesAmount: 129000,
      fee: 12900,
      netAmount: 116100
    },
    {
      orderId: 'ORD-20250106-056',
      orderDate: '2025-01-06',
      productName: '무선 마우스',
      salesAmount: 45000,
      fee: 4500,
      netAmount: 40500
    },
    {
      orderId: 'ORD-20250105-091',
      orderDate: '2025-01-05',
      productName: 'USB-C 허브',
      salesAmount: 59000,
      fee: 5900,
      netAmount: 53100
    },
    {
      orderId: 'ORD-20250105-067',
      orderDate: '2025-01-05',
      productName: '모니터 암',
      salesAmount: 89000,
      fee: 8900,
      netAmount: 80100
    },
    {
      orderId: 'ORD-20250104-123',
      orderDate: '2025-01-04',
      productName: '웹캠 4K',
      salesAmount: 119000,
      fee: 11900,
      netAmount: 107100
    },
    {
      orderId: 'ORD-20250104-089',
      orderDate: '2025-01-04',
      productName: '책상 정리함',
      salesAmount: 28000,
      fee: 2800,
      netAmount: 25200
    },
    {
      orderId: 'ORD-20250103-145',
      orderDate: '2025-01-03',
      productName: 'LED 데스크 램프',
      salesAmount: 75000,
      fee: 7500,
      netAmount: 67500
    },
    {
      orderId: 'ORD-20250103-098',
      orderDate: '2025-01-03',
      productName: '인체공학 마우스 패드',
      salesAmount: 32000,
      fee: 3200,
      netAmount: 28800
    },
    {
      orderId: 'ORD-20250102-167',
      orderDate: '2025-01-02',
      productName: '블루투스 스피커',
      salesAmount: 95000,
      fee: 9500,
      netAmount: 85500
    },
    {
      orderId: 'ORD-20250102-134',
      orderDate: '2025-01-02',
      productName: '휴대용 SSD 1TB',
      salesAmount: 149000,
      fee: 14900,
      netAmount: 134100
    },
    {
      orderId: 'ORD-20250101-089',
      orderDate: '2025-01-01',
      productName: '충전식 손난로',
      salesAmount: 39000,
      fee: 3900,
      netAmount: 35100
    },
    {
      orderId: 'ORD-20250101-045',
      orderDate: '2025-01-01',
      productName: '스마트폰 거치대',
      salesAmount: 25000,
      fee: 2500,
      netAmount: 22500
    }
  ]
};

// 정산 완료 Mock 데이터
export const completedSettlements = [
  {
    id: 1,
    settlementDate: '2025-01-01',
    period: '2024-12-15 ~ 2024-12-31',
    totalSales: 12500000,
    totalFee: 1250000,
    netAmount: 11250000,
    depositStatus: 'completed', // completed, pending
    orderCount: 52
  },
  {
    id: 2,
    settlementDate: '2024-12-15',
    period: '2024-12-01 ~ 2024-12-14',
    totalSales: 8900000,
    totalFee: 890000,
    netAmount: 8010000,
    depositStatus: 'completed',
    orderCount: 38
  },
  {
    id: 3,
    settlementDate: '2024-12-01',
    period: '2024-11-15 ~ 2024-11-30',
    totalSales: 15600000,
    totalFee: 1560000,
    netAmount: 14040000,
    depositStatus: 'completed',
    orderCount: 67
  },
  {
    id: 4,
    settlementDate: '2024-11-15',
    period: '2024-11-01 ~ 2024-11-14',
    totalSales: 9800000,
    totalFee: 980000,
    netAmount: 8820000,
    depositStatus: 'completed',
    orderCount: 41
  },
  {
    id: 5,
    settlementDate: '2024-11-01',
    period: '2024-10-15 ~ 2024-10-31',
    totalSales: 11200000,
    totalFee: 1120000,
    netAmount: 10080000,
    depositStatus: 'completed',
    orderCount: 48
  },
  {
    id: 6,
    settlementDate: '2024-10-15',
    period: '2024-10-01 ~ 2024-10-14',
    totalSales: 7500000,
    totalFee: 750000,
    netAmount: 6750000,
    depositStatus: 'pending',
    orderCount: 32
  },
  {
    id: 7,
    settlementDate: '2024-10-01',
    period: '2024-09-15 ~ 2024-09-30',
    totalSales: 13400000,
    totalFee: 1340000,
    netAmount: 12060000,
    depositStatus: 'completed',
    orderCount: 56
  },
  {
    id: 8,
    settlementDate: '2024-09-15',
    period: '2024-09-01 ~ 2024-09-14',
    totalSales: 10600000,
    totalFee: 1060000,
    netAmount: 9540000,
    depositStatus: 'completed',
    orderCount: 45
  }
];

// 월별 리포트 Mock 데이터
export const monthlyReport = {
  year: 2025,
  month: 1,
  summary: {
    totalSales: 8500000,
    totalFee: 850000,
    netAmount: 7650000,
    orderCount: 47
  },
  dailySales: [
    { date: 1, sales: 250000 },
    { date: 2, sales: 320000 },
    { date: 3, sales: 280000 },
    { date: 4, sales: 390000 },
    { date: 5, sales: 310000 },
    { date: 6, sales: 265000 },
    { date: 7, sales: 295000 },
    { date: 8, sales: 340000 },
    { date: 9, sales: 275000 },
    { date: 10, sales: 305000 },
    { date: 11, sales: 285000 },
    { date: 12, sales: 260000 },
    { date: 13, sales: 330000 },
    { date: 14, sales: 295000 },
    { date: 15, sales: 310000 },
    { date: 16, sales: 280000 },
    { date: 17, sales: 325000 },
    { date: 18, sales: 290000 },
    { date: 19, sales: 270000 },
    { date: 20, sales: 315000 },
    { date: 21, sales: 305000 },
    { date: 22, sales: 285000 },
    { date: 23, sales: 320000 },
    { date: 24, sales: 295000 },
    { date: 25, sales: 310000 },
    { date: 26, sales: 275000 },
    { date: 27, sales: 340000 },
    { date: 28, sales: 300000 },
    { date: 29, sales: 285000 },
    { date: 30, sales: 315000 },
    { date: 31, sales: 290000 }
  ],
  categoryBreakdown: [
    { category: '전자기기', amount: 3400000, percentage: 40, fill: '#3b82f6' },
    { category: '의류', amount: 2550000, percentage: 30, fill: '#8b5cf6' },
    { category: '뷰티', amount: 1700000, percentage: 20, fill: '#ec4899' },
    { category: '기타', amount: 850000, percentage: 10, fill: '#10b981' }
  ]
};
