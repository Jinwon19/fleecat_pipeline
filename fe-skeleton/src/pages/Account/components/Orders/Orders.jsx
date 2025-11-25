import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useOrders } from '../../../../hooks/useOrders'
import Spinner from '../../../../components/common/Spinner'
import ErrorState from '../../../../components/ErrorState'
import EmptyState from '../../../../components/EmptyState'
import OrderCard from './OrderCard'
import OrderFilters from './OrderFilters'
import OrderDetailModal from './OrderDetailModal'
import Pagination from './Pagination'
import './Orders.css'

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedOrder, setSelectedOrder] = useState(null)

  // Parse URL parameters
  const status = searchParams.get('status') || 'all'
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const page = Number(searchParams.get('page')) || 1
  const limit = 10

  // Fetch orders with React Query
  const { data, isLoading, error, refetch } = useOrders({
    status: status !== 'all' ? status : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    page,
    limit
  })

  // Filter change handlers
  const handleStatusChange = (newStatus) => {
    const params = { tab: 'orders', status: newStatus, page: '1' }
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    setSearchParams(params)
  }

  const handleDateRangeChange = ({ startDate, endDate }) => {
    const params = { tab: 'orders', status, page: '1' }
    if (startDate) params.date_from = startDate.toISOString()
    if (endDate) params.date_to = endDate.toISOString()
    setSearchParams(params)
  }

  const handlePageChange = (newPage) => {
    const params = { tab: 'orders', status, page: String(newPage) }
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    setSearchParams(params)
  }

  const handleViewDetail = (order) => {
    setSelectedOrder(order)
  }

  const handleCloseModal = () => {
    setSelectedOrder(null)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="account-section">
        <div className="section-header">
          <h2 className="section-title">주문 내역</h2>
        </div>
        <Spinner message="주문 내역을 불러오는 중..." />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="account-section">
        <div className="section-header">
          <h2 className="section-title">주문 내역</h2>
        </div>
        <ErrorState
          title="주문 내역을 불러올 수 없습니다"
          message="잠시 후 다시 시도해주세요."
          error={error}
          onRetry={refetch}
        />
      </div>
    )
  }

  const orders = data?.orders || []
  const pagination = data?.pagination

  return (
    <div className="account-section">
      <div className="section-header">
        <h2 className="section-title">주문 내역</h2>
      </div>

      <OrderFilters
        startDate={dateFrom ? new Date(dateFrom) : null}
        endDate={dateTo ? new Date(dateTo) : null}
        selectedStatus={status}
        onDateRangeChange={handleDateRangeChange}
        onStatusChange={handleStatusChange}
      />

      {orders.length === 0 ? (
        <EmptyState
          title="주문 내역이 없습니다"
          message="필터를 변경하거나 새로운 주문을 시작해보세요"
        />
      ) : (
        <>
          <div className="orders-list">
            {orders.map(order => (
              <OrderCard
                key={order.order_id}
                order={order}
                onViewDetail={handleViewDetail}
              />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
