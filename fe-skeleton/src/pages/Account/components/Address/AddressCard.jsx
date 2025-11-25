import Button from '../../../../components/common/Button'
import './AddressCard.css'

export default function AddressCard({ address, onEdit, onDelete, onSetDefault }) {
  const handleDelete = () => {
    if (window.confirm('배송지를 삭제하시겠습니까?')) {
      onDelete(address.member_address_id)
    }
  }

  const handleSetDefault = () => {
    onSetDefault(address.member_address_id)
  }

  const handleEdit = () => {
    onEdit(address)
  }

  return (
    <div className="address-card">
      {address.member_address_is_default && (
        <span className="default-badge">기본 배송지</span>
      )}

      <div className="address-info">
        <div className="address-row">
          <span className="address-label">배송지명</span>
          <span className="address-value">{address.member_address_alias}</span>
        </div>

        <div className="address-row">
          <span className="address-label">수령인</span>
          <span className="address-value">{address.member_address_recipient}</span>
        </div>

        <div className="address-row">
          <span className="address-label">연락처</span>
          <span className="address-value">{address.member_address_phone}</span>
        </div>

        <div className="address-row address-full">
          <span className="address-label">주소</span>
          <div className="address-text">
            <span className="postal-code">({address.member_address_zipcode})</span>
            <span className="address-main">{address.member_address_address1}</span>
            {address.member_address_address2 && (
              <span className="address-detail">{address.member_address_address2}</span>
            )}
          </div>
        </div>
      </div>

      <div className="address-actions">
        {!address.member_address_is_default && (
          <Button
            variant="secondary"
            onClick={handleSetDefault}
          >
            기본 배송지로 설정
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={handleEdit}
        >
          수정
        </Button>
        <Button
          variant="danger"
          onClick={handleDelete}
        >
          삭제
        </Button>
      </div>
    </div>
  )
}
