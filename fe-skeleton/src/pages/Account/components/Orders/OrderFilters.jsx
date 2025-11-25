import DateRangePicker from '../../../../components/common/DateRangePicker'
import StatusChip from '../../../../components/common/StatusChip'
import './OrderFilters.css'

const STATUSES = [
  'all',
  'pending_payment',
  'payment_completed',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
]

export default function OrderFilters({
  startDate,
  endDate,
  selectedStatus,
  onDateRangeChange,
  onStatusChange
}) {
  return (
    <div className="order-filters">
      <div className="filter-group">
        <label className="filter-label">기간</label>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onChange={onDateRangeChange}
        />
      </div>

      <div className="filter-group">
        <label className="filter-label">주문 상태</label>
        <div className="status-chips">
          {STATUSES.map(status => (
            <StatusChip
              key={status}
              status={status}
              selected={selectedStatus === status}
              onClick={() => onStatusChange(status)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
