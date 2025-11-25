import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createAddressSchema } from '../../../../schemas/address'
import { openPostcodePopup, mapPostcodeResult } from '../../../../utils/postcode'
import Button from '../../../../components/common/Button'
import Input from '../../../../components/common/Input'
import './AddressForm.css'

export default function AddressForm({ initialData, onSubmit, onCancel }) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(createAddressSchema),
    defaultValues: initialData || {
      member_address_alias: '',
      member_address_is_default: false,
      member_address_recipient: '',
      member_address_phone: '',
      member_address_zipcode: '',
      member_address_address1: '',
      member_address_address2: ''
    }
  })

  const handleSearchAddress = () => {
    openPostcodePopup((data) => {
      const mapped = mapPostcodeResult(data)
      setValue('member_address_zipcode', mapped.member_address_zipcode)
      setValue('member_address_address1', mapped.member_address_address1)
    })
  }

  return (
    <div className="address-form-container">
      <form onSubmit={handleSubmit(onSubmit)} className="address-form">
        {/* 배송지 이름 */}
        <div className="form-group">
          <label htmlFor="alias" className="form-label">
            배송지 이름 <span className="required">*</span>
          </label>
          <Input
            id="alias"
            type="text"
            placeholder="예: 집, 회사"
            {...register('member_address_alias')}
            className={errors.member_address_alias ? 'error' : ''}
          />
          {errors.member_address_alias && (
            <span className="error-message">{errors.member_address_alias.message}</span>
          )}
        </div>

        {/* 받는 분 */}
        <div className="form-group">
          <label htmlFor="recipient" className="form-label">
            받는 분 <span className="required">*</span>
          </label>
          <Input
            id="recipient"
            type="text"
            {...register('member_address_recipient')}
            className={errors.member_address_recipient ? 'error' : ''}
          />
          {errors.member_address_recipient && (
            <span className="error-message">{errors.member_address_recipient.message}</span>
          )}
        </div>

        {/* 연락처 */}
        <div className="form-group">
          <label htmlFor="phone" className="form-label">
            연락처 <span className="required">*</span>
          </label>
          <Input
            id="phone"
            type="tel"
            placeholder="010-0000-0000"
            {...register('member_address_phone')}
            className={errors.member_address_phone ? 'error' : ''}
          />
          {errors.member_address_phone && (
            <span className="error-message">{errors.member_address_phone.message}</span>
          )}
        </div>

        {/* 우편번호 */}
        <div className="form-group">
          <label htmlFor="zipcode" className="form-label">
            우편번호 <span className="required">*</span>
          </label>
          <div className="address-search-row">
            <Input
              id="zipcode"
              type="text"
              readOnly
              {...register('member_address_zipcode')}
              className={`postal-code-input ${errors.member_address_zipcode ? 'error' : ''}`}
              placeholder="우편번호"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleSearchAddress}
            >
              우편번호 찾기
            </Button>
          </div>
          {errors.member_address_zipcode && (
            <span className="error-message">{errors.member_address_zipcode.message}</span>
          )}
        </div>

        {/* 기본 주소 */}
        <div className="form-group">
          <label htmlFor="address1" className="form-label">
            주소 <span className="required">*</span>
          </label>
          <Input
            id="address1"
            type="text"
            readOnly
            {...register('member_address_address1')}
            className={errors.member_address_address1 ? 'error' : ''}
            placeholder="주소"
          />
          {errors.member_address_address1 && (
            <span className="error-message">{errors.member_address_address1.message}</span>
          )}
        </div>

        {/* 상세 주소 */}
        <div className="form-group">
          <label htmlFor="address2" className="form-label">상세 주소</label>
          <Input
            id="address2"
            type="text"
            placeholder="동, 호수 등"
            {...register('member_address_address2')}
          />
        </div>

        {/* 기본 배송지 설정 */}
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              {...register('member_address_is_default')}
              className="checkbox-input"
            />
            <span>기본 배송지로 설정</span>
          </label>
        </div>

        {/* 버튼 */}
        <div className="form-actions">
          <Button
            type="button"
            onClick={onCancel}
            variant="secondary"
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            variant="primary"
          >
            {isSubmitting ? '저장 중...' : '저장'}
          </Button>
        </div>
      </form>
    </div>
  )
}
