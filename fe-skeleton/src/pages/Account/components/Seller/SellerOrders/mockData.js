// SellerOrders Mock Data

// 주문 40건 생성
export const mockOrders = Array.from({ length: 40 }, (_, index) => {
  const orderNum = String(index + 1).padStart(3, '0');
  const dayOffset = Math.floor(index / 5);
  const date = new Date(); // 현재 날짜 기준
  date.setDate(date.getDate() - dayOffset);
  
  const statuses = ['paid', 'preparing', 'shipping', 'delivered', 'cancelled'];
  const status = statuses[index % 5];
  
  const customers = ['김철수', '이영희', '박민수', '정수진', '최동욱', '강미영', '임재현', '송하늘'];
  const productNames = [
    '프리미엄 무선 이어폰',
    '스마트워치',
    '고급 가죽 핸드백',
    '디지털 노트북',
    '패션 악세서리 세트',
    '조리도구 세트',
    '인테리어 장식 소품',
    '사무용품 세트'
  ];
  
  const productCount = Math.floor(Math.random() * 3) + 1;
  const products = Array.from({ length: productCount }, (_, i) => ({
    id: i + 1,
    name: productNames[Math.floor(Math.random() * productNames.length)],
    option: i === 0 ? null : `옵션${i}`,
    quantity: Math.floor(Math.random() * 3) + 1,
    price: (Math.floor(Math.random() * 20) + 5) * 10000
  }));
  
  const totalAmount = products.reduce((sum, p) => sum + (p.price * p.quantity), 0) + 3000;
  
  return {
    id: `ORD-${date.toISOString().split('T')[0].replace(/-/g, '')}-${orderNum}`,
    orderDate: `${date.toISOString().split('T')[0]} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
    customerName: customers[index % customers.length],
    products,
    totalAmount,
    status,
    customer: {
      name: customers[index % customers.length],
      phone: `010-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
      email: `customer${index + 1}@example.com`
    },
    shipping: {
      recipient: customers[index % customers.length],
      address: `서울시 강남구 테헤란로 ${Math.floor(Math.random() * 500) + 1}`,
      phone: `010-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
      memo: index % 3 === 0 ? '부재시 경비실에 맡겨주세요' : index % 3 === 1 ? '배송 전 연락 부탁드립니다' : ''
    },
    payment: {
      productAmount: totalAmount - 3000,
      shippingFee: 3000,
      discount: 0,
      totalAmount
    },
    timeline: generateTimeline(status, date),
    tracking: status === 'shipping' || status === 'delivered' ? {
      courier: ['CJ대한통운', '우체국택배', '롯데택배', '한진택배'][Math.floor(Math.random() * 4)],
      trackingNumber: String(Math.floor(Math.random() * 900000000000) + 100000000000)
    } : null,
    memo: '',
    cancelRequest: status === 'cancelled' ? {
      reason: '단순 변심',
      requestDate: date.toISOString().split('T')[0]
    } : null
  };
});

function generateTimeline(status, baseDate) {
  const timeline = [];
  const date = new Date(baseDate);
  
  timeline.push({
    status: 'paid',
    label: '결제완료',
    timestamp: date.toISOString().replace('T', ' ').split('.')[0]
  });
  
  if (status === 'cancelled') {
    date.setHours(date.getHours() + 2);
    timeline.push({
      status: 'cancelled',
      label: '취소/환불',
      timestamp: date.toISOString().replace('T', ' ').split('.')[0]
    });
    return timeline;
  }
  
  if (status !== 'paid') {
    date.setHours(date.getHours() + 1);
    timeline.push({
      status: 'preparing',
      label: '상품준비중',
      timestamp: date.toISOString().replace('T', ' ').split('.')[0]
    });
  }
  
  if (status === 'shipping' || status === 'delivered') {
    date.setDate(date.getDate() + 1);
    timeline.push({
      status: 'shipping',
      label: '배송중',
      timestamp: date.toISOString().replace('T', ' ').split('.')[0]
    });
  }
  
  if (status === 'delivered') {
    date.setDate(date.getDate() + 1);
    timeline.push({
      status: 'delivered',
      label: '배송완료',
      timestamp: date.toISOString().replace('T', ' ').split('.')[0]
    });
  }
  
  return timeline;
}

export const statusOptions = [
  { value: '', label: '전체 상태' },
  { value: 'paid', label: '결제완료' },
  { value: 'preparing', label: '상품준비중' },
  { value: 'shipping', label: '배송중' },
  { value: 'delivered', label: '배송완료' },
  { value: 'cancelled', label: '취소/환불' }
];

export const periodOptions = [
  { value: 'today', label: '오늘' },
  { value: 'week', label: '1주일' },
  { value: 'month', label: '1개월' },
  { value: '3months', label: '3개월' }
];

export const courierOptions = [
  { value: '', label: '택배사 선택' },
  { value: 'CJ대한통운', label: 'CJ대한통운' },
  { value: '우체국택배', label: '우체국택배' },
  { value: '롯데택배', label: '롯데택배' },
  { value: '한진택배', label: '한진택배' }
];
