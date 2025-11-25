import { useState } from 'react'
import { useAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress, useSetDefaultAddress } from '../../../../hooks/useAddress'
import Button from '../../../../components/common/Button'
import Spinner from '../../../../components/common/Spinner'
import AddressForm from './AddressForm'
import AddressCard from './AddressCard'
import './Address.css'

export default function Address() {
  const [showForm, setShowForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)

  // React Query hooks
  const { data: addresses = [], isLoading } = useAddresses()
  const createAddress = useCreateAddress()
  const updateAddress = useUpdateAddress()
  const deleteAddress = useDeleteAddress()
  const setDefaultAddress = useSetDefaultAddress()

  const handleAddAddress = () => {
    setEditingAddress(null)
    setShowForm(true)
  }

  const handleEditAddress = (address) => {
    // Convert address data to form format
    const formData = {
      member_address_alias: address.member_address_alias,
      member_address_recipient: address.member_address_recipient,
      member_address_phone: address.member_address_phone,
      member_address_zipcode: address.member_address_zipcode,
      member_address_address1: address.member_address_address1,
      member_address_address2: address.member_address_address2,
      member_address_is_default: address.member_address_is_default
    }
    setEditingAddress({ ...address, ...formData })
    setShowForm(true)
  }

  const handleDeleteAddress = (addressId) => {
    deleteAddress.mutate(addressId)
  }

  const handleSetDefault = (addressId) => {
    setDefaultAddress.mutate(addressId)
  }

  const handleSaveAddress = (addressData) => {
    if (editingAddress) {
      // 수정
      updateAddress.mutate(
        { id: editingAddress.member_address_id, data: addressData },
        {
          onSuccess: () => {
            setShowForm(false)
            setEditingAddress(null)
          }
        }
      )
    } else {
      // 추가
      createAddress.mutate(addressData, {
        onSuccess: () => {
          setShowForm(false)
        }
      })
    }
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingAddress(null)
  }

  if (isLoading) {
    return (
      <div className="account-section">
        <h2 className="section-title">배송지 관리</h2>
        <Spinner message="로딩 중..." />
      </div>
    )
  }

  return (
    <div className="account-section">
      <div className="section-header">
        <h2 className="section-title">배송지 관리</h2>
        {!showForm && (
          <Button variant="primary" onClick={handleAddAddress}>
            배송지 추가
          </Button>
        )}
      </div>

      {showForm ? (
        <AddressForm
          initialData={editingAddress}
          onSubmit={handleSaveAddress}
          onCancel={handleCancelForm}
        />
      ) : addresses.length === 0 ? (
        <div className="empty-state">
          <p>등록된 배송지가 없습니다</p>
          <Button variant="primary" onClick={handleAddAddress}>
            배송지 추가
          </Button>
        </div>
      ) : (
        <div className="address-list">
          {addresses.map(address => (
            <AddressCard
              key={address.member_address_id}
              address={address}
              onEdit={handleEditAddress}
              onDelete={handleDeleteAddress}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      )}
    </div>
  )
}
