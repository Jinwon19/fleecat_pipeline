import { useState } from 'react';
import { Truck, Package } from 'lucide-react';
import Select from '../../../../../components/common/Select';
import Input from '../../../../../components/common/Input';
import Button from '../../../../../components/common/Button';
import Badge from '../../../../../components/common/Badge';
import './ShippingForm.css';

export default function ShippingForm({ 
  order, 
  onStatusChange, 
  onTrackingUpdate,
  courierOptions 
}) {
  const [courier, setCourier] = useState(order.tracking?.courier || '');
  const [trackingNumber, setTrackingNumber] = useState(order.tracking?.trackingNumber || '');

  const handleSaveTracking = () => {
    if (!courier || !trackingNumber) {
      alert('택배사와 송장번호를 모두 입력하세요');
      return;
    }
    onTrackingUpdate({ courier, trackingNumber });
  };

  const canStartShipping = order.status === 'preparing';
  const canCompleteShipping = order.status === 'shipping';

  const getStatusBadge = (status) => {
    const statusMap = {
      paid: { variant: 'info', label: '결제완료' },
      preparing: { variant: 'warning', label: '상품준비중' },
      shipping: { variant: 'info', label: '배송중' },
      delivered: { variant: 'success', label: '배송완료' },
      cancelled: { variant: 'danger', label: '취소/환불' }
    };
    const config = statusMap[status] || statusMap.paid;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="shipping-form">
      <h4 className="shipping-title">
        <Truck size={20} />
        배송 관리
      </h4>

      {/* 현재 상태 */}
      <div className="current-status">
        <span className="status-label">현재 상태</span>
        {getStatusBadge(order.status)}
      </div>

      {/* 송장 정보 입력 */}
      {(canStartShipping || canCompleteShipping) && (
        <div className="tracking-input">
          <Select
            label="택배사"
            options={courierOptions}
            value={courier}
            onChange={setCourier}
            placeholder="택배사 선택"
          />

          <Input
            label="송장번호"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="송장번호 입력"
          />

          <Button
            variant="secondary"
            onClick={handleSaveTracking}
            fullWidth
          >
            송장 정보 저장
          </Button>
        </div>
      )}

      {/* 기존 송장 정보 표시 */}
      {order.tracking && (
        <div className="tracking-info">
          <Package size={18} />
          <div>
            <p className="tracking-courier">{order.tracking.courier}</p>
            <p className="tracking-number">{order.tracking.trackingNumber}</p>
          </div>
        </div>
      )}

      {/* 상태 변경 버튼 */}
      <div className="status-actions">
        {canStartShipping && (
          <Button
            onClick={() => onStatusChange('shipping')}
            fullWidth
          >
            배송 시작
          </Button>
        )}

        {canCompleteShipping && (
          <Button
            variant="success"
            onClick={() => onStatusChange('delivered')}
            fullWidth
          >
            배송 완료
          </Button>
        )}

        {(order.status === 'delivered' || order.status === 'cancelled') && (
          <div className="status-complete">
            {order.status === 'delivered' ? '배송이 완료되었습니다' : '취소/환불 처리되었습니다'}
          </div>
        )}
      </div>
    </div>
  );
}
