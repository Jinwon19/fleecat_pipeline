// src/api/restock.js
import { supabase } from '../lib/supabaseClient'

/**
 * 재입고 알림 신청
 * @param {Object} data - 재입고 알림 신청 정보
 * @param {string} data.userId - 사용자 ID
 * @param {string} data.productId - 상품 ID
 * @param {string} data.optionId - 옵션 ID (옵션이 있는 상품인 경우)
 * @param {Array<string>} data.notificationMethods - 알림 수신 방법 ['email', 'sms']
 * @param {string} data.email - 이메일 주소
 * @param {string} data.phone - 휴대폰 번호
 * @returns {Promise<Object>} 생성된 재입고 알림 정보
 */
export async function subscribeRestockNotification(data) {
  try {
    const { userId, productId, optionId, notificationMethods, email, phone } = data

    // 이미 신청한 알림이 있는지 확인
    let query = supabase
      .from('restock_notifications')
      .select('notification_id')
      .eq('user_id', userId)
      .eq('product_id', productId)

    if (optionId) {
      query = query.eq('option_id', optionId)
    } else {
      query = query.is('option_id', null)
    }

    const { data: existingNotification } = await query.single()

    if (existingNotification) {
      throw new Error('이미 재입고 알림을 신청하셨습니다')
    }

    // 신규 알림 신청
    const { data: newNotification, error } = await supabase
      .from('restock_notifications')
      .insert([
        {
          user_id: userId,
          product_id: productId,
          option_id: optionId || null,
          notification_methods: notificationMethods,
          email,
          phone,
          status: 'active',
        },
      ])
      .select()
      .single()

    if (error) throw error

    return newNotification
  } catch (error) {
    console.error('Error subscribing restock notification:', error)
    throw new Error(error.message || '재입고 알림 신청에 실패했습니다')
  }
}

/**
 * 재입고 알림 취소
 * @param {string} notificationId - 재입고 알림 ID
 * @returns {Promise<void>}
 */
export async function unsubscribeRestockNotification(notificationId) {
  try {
    const { error } = await supabase
      .from('restock_notifications')
      .update({ status: 'cancelled' })
      .eq('notification_id', notificationId)

    if (error) throw error
  } catch (error) {
    console.error('Error unsubscribing restock notification:', error)
    throw new Error(error.message || '재입고 알림 취소에 실패했습니다')
  }
}

/**
 * 사용자의 재입고 알림 목록 조회
 * @param {string} userId - 사용자 ID
 * @param {string} status - 알림 상태 ('active', 'sent', 'cancelled')
 * @returns {Promise<Array>} 재입고 알림 목록
 */
export async function fetchRestockNotifications(userId, status = 'active') {
  try {
    const { data, error } = await supabase
      .from('restock_notifications')
      .select(
        `
        notification_id,
        option_id,
        notification_methods,
        email,
        phone,
        status,
        created_at,
        products (
          product_id,
          product_name,
          brand_name,
          price,
          thumbnail_url,
          is_sold_out
        )
      `
      )
      .eq('user_id', userId)
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) throw error

    // 데이터 변환
    return data.map((item) => ({
      notificationId: item.notification_id,
      optionId: item.option_id,
      notificationMethods: item.notification_methods,
      email: item.email,
      phone: item.phone,
      status: item.status,
      createdAt: item.created_at,
      productId: item.products.product_id,
      productName: item.products.product_name,
      brandName: item.products.brand_name,
      price: item.products.price,
      thumbnailUrl: item.products.thumbnail_url,
      isSoldOut: item.products.is_sold_out,
    }))
  } catch (error) {
    console.error('Error fetching restock notifications:', error)
    throw new Error(error.message || '재입고 알림 목록을 불러오는데 실패했습니다')
  }
}

/**
 * 상품의 재입고 알림 신청 여부 확인
 * @param {string} userId - 사용자 ID
 * @param {string} productId - 상품 ID
 * @param {string} optionId - 옵션 ID (선택사항)
 * @returns {Promise<boolean>} 신청 여부
 */
export async function checkRestockNotificationStatus(userId, productId, optionId = null) {
  try {
    let query = supabase
      .from('restock_notifications')
      .select('notification_id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .eq('status', 'active')

    if (optionId) {
      query = query.eq('option_id', optionId)
    } else {
      query = query.is('option_id', null)
    }

    const { data, error } = await query.single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116: 결과 없음 (알림 신청 안 함)
      throw error
    }

    return !!data
  } catch (error) {
    console.error('Error checking restock notification status:', error)
    return false
  }
}
