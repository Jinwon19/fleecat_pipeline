// src/api/wishlist.js
import { supabase } from '../lib/supabaseClient'

/**
 * 사용자의 찜 목록 조회
 * @param {string} userId - 사용자 ID
 * @param {Object} options - 필터 및 정렬 옵션
 * @returns {Promise<Array>} 찜 목록 배열
 */
export async function fetchWishlist(userId, options = {}) {
  const { sort = 'latest', category = 'all', status = 'all' } = options

  try {
    let query = supabase
      .from('wishlists')
      .select(
        `
        wishlist_id,
        created_at,
        products (
          product_id,
          product_name,
          brand_name,
          price,
          original_price,
          thumbnail_url,
          category,
          is_sold_out,
          has_options,
          is_free_shipping,
          is_today_shipping
        )
      `
      )
      .eq('user_id', userId)

    // 카테고리 필터
    if (category !== 'all') {
      query = query.eq('products.category', category)
    }

    // 상태 필터
    if (status === 'available') {
      query = query.eq('products.is_sold_out', false)
    } else if (status === 'soldout') {
      query = query.eq('products.is_sold_out', true)
    }

    // 정렬
    if (sort === 'latest') {
      query = query.order('created_at', { ascending: false })
    } else if (sort === 'price_asc') {
      query = query.order('products.price', { ascending: true })
    } else if (sort === 'price_desc') {
      query = query.order('products.price', { ascending: false })
    }

    const { data, error } = await query

    if (error) throw error

    // 데이터 변환
    return data.map((item) => ({
      wishlistId: item.wishlist_id,
      wishlistedAt: item.created_at,
      productId: item.products.product_id,
      productName: item.products.product_name,
      brandName: item.products.brand_name,
      price: item.products.price,
      originalPrice: item.products.original_price,
      thumbnailUrl: item.products.thumbnail_url,
      category: item.products.category,
      isSoldOut: item.products.is_sold_out,
      hasOptions: item.products.has_options,
      isFreeShipping: item.products.is_free_shipping,
      isTodayShipping: item.products.is_today_shipping,
    }))
  } catch (error) {
    console.error('Error fetching wishlist:', error)
    throw new Error(error.message || '찜 목록을 불러오는데 실패했습니다')
  }
}

/**
 * 찜 목록에서 단일 상품 제거
 * @param {string} wishlistId - 찜 ID
 * @returns {Promise<void>}
 */
export async function removeFromWishlist(wishlistId) {
  try {
    const { error } = await supabase.from('wishlists').delete().eq('wishlist_id', wishlistId)

    if (error) throw error
  } catch (error) {
    console.error('Error removing from wishlist:', error)
    throw new Error(error.message || '찜 해제에 실패했습니다')
  }
}

/**
 * 찜 목록에서 여러 상품 제거
 * @param {Array<string>} wishlistIds - 찜 ID 배열
 * @returns {Promise<void>}
 */
export async function bulkRemoveFromWishlist(wishlistIds) {
  try {
    const { error } = await supabase.from('wishlists').delete().in('wishlist_id', wishlistIds)

    if (error) throw error
  } catch (error) {
    console.error('Error bulk removing from wishlist:', error)
    throw new Error(error.message || '찜 해제에 실패했습니다')
  }
}

/**
 * 상품을 찜 목록에 추가
 * @param {string} userId - 사용자 ID
 * @param {string} productId - 상품 ID
 * @returns {Promise<Object>} 생성된 찜 정보
 */
export async function addToWishlist(userId, productId) {
  try {
    const { data, error } = await supabase
      .from('wishlists')
      .insert([{ user_id: userId, product_id: productId }])
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error adding to wishlist:', error)
    throw new Error(error.message || '찜 추가에 실패했습니다')
  }
}

/**
 * 상품이 찜 목록에 있는지 확인
 * @param {string} userId - 사용자 ID
 * @param {string} productId - 상품 ID
 * @returns {Promise<boolean>} 찜 여부
 */
export async function checkWishlistStatus(userId, productId) {
  try {
    const { data, error } = await supabase
      .from('wishlists')
      .select('wishlist_id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116: 결과 없음 (찜하지 않음)
      throw error
    }

    return !!data
  } catch (error) {
    console.error('Error checking wishlist status:', error)
    return false
  }
}
