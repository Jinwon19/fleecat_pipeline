import { useState, useMemo } from 'react';
import { Package } from 'lucide-react';
import OrderFilters from './OrderFilters';
import OrderTable from './OrderTable';
import OrderDetailModal from './OrderDetailModal';
import Pagination from '../SellerProducts/Pagination';
import { mockOrders, statusOptions, periodOptions, courierOptions } from './mockData';
import toast from '../../../../../lib/toast';
import './SellerOrders.css';

export default function SellerOrders() {
  const [orders, setOrders] = useState(mockOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [period, setPeriod] = useState('month');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const itemsPerPage = 15;

  // 기간 필터링
  const getDateFilter = (periodValue) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (periodValue) {
      case 'today':
        return today;
      case 'week': {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return weekAgo;
      }
      case 'month': {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return monthAgo;
      }
      case '3months': {
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return threeMonthsAgo;
      }
      default:
        return null;
    }
  };

  // 필터링된 주문
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // 검색
    if (searchQuery) {
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 상태 필터
    if (statusFilter) {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // 기간 필터
    const dateFilter = getDateFilter(period);
    if (dateFilter) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate >= dateFilter;
      });
    }

    // 최신순 정렬
    filtered.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));

    return filtered;
  }, [orders, searchQuery, statusFilter, period]);

  // 페이지네이션
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredOrders.slice(start, end);
  }, [filteredOrders, currentPage]);

  // 페이지 변경
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 주문 상세 보기
  const handleViewDetail = (order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  // 주문 상세 닫기
  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedOrder(null);
  };

  // 배송 상태 변경
  const handleStatusChange = (newStatus) => {
    if (!selectedOrder) return;

    if (!window.confirm('배송 상태를 변경하시겠습니까?')) return;

    setOrders(orders.map(order => {
      if (order.id === selectedOrder.id) {
        const updatedOrder = { ...order, status: newStatus };
        
        // 타임라인 업데이트
        const now = new Date().toISOString().replace('T', ' ').split('.')[0];
        const statusLabel = {
          shipping: '배송중',
          delivered: '배송완료'
        }[newStatus];

        if (statusLabel) {
          updatedOrder.timeline = [
            ...order.timeline,
            { status: newStatus, label: statusLabel, timestamp: now }
          ];
        }

        setSelectedOrder(updatedOrder);
        return updatedOrder;
      }
      return order;
    }));

    toast.success('배송 상태가 변경되었습니다');
  };

  // 송장 정보 업데이트
  const handleTrackingUpdate = (trackingInfo) => {
    if (!selectedOrder) return;

    setOrders(orders.map(order => {
      if (order.id === selectedOrder.id) {
        const updatedOrder = { ...order, tracking: trackingInfo };
        setSelectedOrder(updatedOrder);
        return updatedOrder;
      }
      return order;
    }));

    toast.success('송장 정보가 저장되었습니다');
  };

  // 메모 저장
  const handleMemoSave = (orderId, memo) => {
    setOrders(orders.map(order => {
      if (order.id === orderId) {
        const updatedOrder = { ...order, memo };
        setSelectedOrder(updatedOrder);
        return updatedOrder;
      }
      return order;
    }));

    toast.success('메모가 저장되었습니다');
  };

  return (
    <div className="account-section">
      <div className="seller-orders">
        {/* 헤더 */}
        <div className="orders-header">
          <div>
            <h2 className="section-title">
              <Package size={24} />
              판매 주문
            </h2>
            <p className="section-subtitle">
              총 {filteredOrders.length}개 주문
            </p>
          </div>
        </div>

      {/* 필터 */}
      <OrderFilters
        searchQuery={searchQuery}
        status={statusFilter}
        period={period}
        onSearchChange={setSearchQuery}
        onStatusChange={setStatusFilter}
        onPeriodChange={setPeriod}
        statusOptions={statusOptions}
        periodOptions={periodOptions}
      />

      {/* 주문 테이블 */}
      <OrderTable
        orders={paginatedOrders}
        onViewDetail={handleViewDetail}
      />

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {/* 주문 상세 모달 */}
      <OrderDetailModal
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        order={selectedOrder}
        onStatusChange={handleStatusChange}
        onTrackingUpdate={handleTrackingUpdate}
        onMemoSave={handleMemoSave}
        courierOptions={courierOptions}
      />
      </div>
    </div>
  );
}