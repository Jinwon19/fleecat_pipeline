import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useProfile, useUpdateProfile } from '../../../../hooks/useProfile.ts'
import { ProfileUpdateSchema } from '../../../../schemas/member'
import ErrorState from '../../../../components/ErrorState'
import SkeletonList from '../../../../components/SkeletonList'
import Button from '../../../../components/common/Button'
import './Profile.css'

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false)

  // React Query hooks
  const { data: profile, isLoading, error, refetch } = useProfile()
  const updateProfile = useUpdateProfile()

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting }
  } = useForm({
    resolver: zodResolver(ProfileUpdateSchema),
    values: profile ? {
      member_name: profile.member_name || '',
      member_nickname: profile.member_nickname || '',
      member_phone: profile.member_phone || '',
      member_marketing_email: profile.member_marketing_email || false,
      member_marketing_sms: profile.member_marketing_sms || false
    } : undefined
  })

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      await updateProfile.mutateAsync(data)
      setIsEditing(false)
      reset(data) // Reset form with new values
    } catch (error) {
      // Error is handled by the hook
      console.error('Profile update error:', error)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    reset() // Reset to original values
    setIsEditing(false)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="account-section">
        <div className="section-header">
          <h2 className="section-title">기본 정보</h2>
        </div>
        <SkeletonList count={5} variant="list" height="60px" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="account-section">
        <div className="section-header">
          <h2 className="section-title">기본 정보</h2>
        </div>
        <ErrorState
          title="프로필을 불러올 수 없습니다"
          error={error}
          variant="network"
          onRetry={refetch}
        />
      </div>
    )
  }

  return (
    <div className="account-section">
      <div className="section-header">
        <h2 className="section-title">기본 정보</h2>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            수정
          </Button>
        ) : (
          <div className="edit-actions">
            <Button
              variant="secondary"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={!isDirty || isSubmitting}
            >
              {isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="profile-card">
        {/* 이메일 (읽기 전용) */}
        <div className="profile-item">
          <label className="profile-label">이메일</label>
          <input
            type="email"
            value={profile.member_email}
            disabled
            className="profile-input profile-input--disabled"
            aria-label="이메일 (변경 불가)"
          />
          <span className="profile-hint">이메일은 변경할 수 없습니다</span>
        </div>

        {/* 이름 */}
        <div className="profile-item">
          <label htmlFor="member_name" className="profile-label">
            이름 <span className="required">*</span>
          </label>
          {isEditing ? (
            <>
              <input
                id="member_name"
                type="text"
                {...register('member_name')}
                className={`profile-input ${errors.member_name ? 'profile-input--error' : ''}`}
                placeholder="이름을 입력하세요"
                aria-invalid={errors.member_name ? 'true' : 'false'}
                aria-describedby={errors.member_name ? 'member_name-error' : undefined}
              />
              {errors.member_name && (
                <span
                  id="member_name-error"
                  className="profile-error"
                  role="alert"
                >
                  {errors.member_name.message}
                </span>
              )}
            </>
          ) : (
            <span className="profile-value">{profile.member_name || '-'}</span>
          )}
        </div>

        {/* 닉네임 */}
        <div className="profile-item">
          <label htmlFor="member_nickname" className="profile-label">
            닉네임 <span className="required">*</span>
          </label>
          {isEditing ? (
            <>
              <input
                id="member_nickname"
                type="text"
                {...register('member_nickname')}
                className={`profile-input ${errors.member_nickname ? 'profile-input--error' : ''}`}
                placeholder="닉네임을 입력하세요"
                aria-invalid={errors.member_nickname ? 'true' : 'false'}
                aria-describedby={errors.member_nickname ? 'member_nickname-error' : undefined}
              />
              {errors.member_nickname && (
                <span
                  id="member_nickname-error"
                  className="profile-error"
                  role="alert"
                >
                  {errors.member_nickname.message}
                </span>
              )}
            </>
          ) : (
            <span className="profile-value">{profile.member_nickname || '-'}</span>
          )}
        </div>

        {/* 전화번호 */}
        <div className="profile-item">
          <label htmlFor="member_phone" className="profile-label">휴대폰 번호</label>
          {isEditing ? (
            <>
              <input
                id="member_phone"
                type="tel"
                {...register('member_phone')}
                className={`profile-input ${errors.member_phone ? 'profile-input--error' : ''}`}
                placeholder="010-0000-0000"
                aria-invalid={errors.member_phone ? 'true' : 'false'}
                aria-describedby={errors.member_phone ? 'member_phone-error' : undefined}
              />
              {errors.member_phone && (
                <span
                  id="member_phone-error"
                  className="profile-error"
                  role="alert"
                >
                  {errors.member_phone.message}
                </span>
              )}
            </>
          ) : (
            <span className="profile-value">{profile.member_phone || '-'}</span>
          )}
        </div>

        {/* 마케팅 수신 동의 */}
        <div className="profile-item profile-item--marketing">
          <span className="profile-label">마케팅 수신 동의</span>
          {isEditing ? (
            <div className="marketing-checkboxes">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  {...register('member_marketing_email')}
                  className="checkbox-input"
                />
                <span>이메일 수신 동의</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  {...register('member_marketing_sms')}
                  className="checkbox-input"
                />
                <span>SMS 수신 동의</span>
              </label>
            </div>
          ) : (
            <div className="marketing-status">
              <span className="profile-value">
                이메일: {profile.member_marketing_email ? '동의' : '미동의'}
              </span>
              <span className="profile-value">
                SMS: {profile.member_marketing_sms ? '동의' : '미동의'}
              </span>
            </div>
          )}
        </div>

        {/* 가입일 (읽기 전용) */}
        <div className="profile-item">
          <span className="profile-label">가입일</span>
          <span className="profile-value">
            {profile.member_created_at
              ? new Date(profile.member_created_at).toLocaleDateString('ko-KR')
              : '-'
            }
          </span>
        </div>
      </form>
    </div>
  )
}
