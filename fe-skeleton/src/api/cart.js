// src/api/cart.js
import { supabase } from '../lib/supabaseClient'

/**
 * 장바구니에 상품 추가
 * @param {string} userId - 사용자 ID
 * @param {string} productId - 상품 ID
 * @param {number} quantity - 수량
 * @param {Object} options - 선택된 옵션들 (예: { size: 'M', color: '블랙' })
 * @returns {Promise<Object>} 추가된 장바구니 항목
 */
export async function addToCart(userId, productId, quantity = 1, options = null) {
  try {
    // 같은 상품과 옵션 조합이 이미 장바구니에 있는지 확인
    let query = supabase
      .from('cart_items')
      .select('cart_item_id, quantity')
      .eq('user_id', userId)
      .eq('product_id', productId)

    if (options) {
      query = query.eq('selected_options', JSON.stringify(options))
    } else {
      query = query.is('selected_options', null)
    }

    const { data: existingItem, error: selectError } = await query.single()

    // 이미 존재하는 경우 수량 업데이트
    if (existingItem) {
      const { data, error } = await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('cart_item_id', existingItem.cart_item_id)
        .select()
        .single()

      if (error) throw error
      return data
    }

    // 새로 추가
    const { data, error } = await supabase
      .from('cart_items')
      .insert([
        {
          user_id: userId,
          product_id: productId,
          quantity,
          selected_options: options ? JSON.stringify(options) : null,
        },
      ])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding to cart:', error)
    throw new Error(error.message || '장바구니에 담는데 실패했습니다')
  }
}

/**
 * 여러 상품을 장바구니에 일괄 추가
 * @param {string} userId - 사용자 ID
 * @param {Array<Object>} items - 상품 배열 [{ productId, quantity, options }]
 * @returns {Promise<Array>} 추가된 장바구니 항목들
 */
export async function bulkAddToCart(userId, items) {
  try {
    const cartItems = items.map((item) => ({
      user_id: userId,
      product_id: item.productId,
      quantity: item.quantity || 1,
      selected_options: item.options ? JSON.stringify(item.options) : null,
    }))

    const { data, error } = await supabase.from('cart_items').insert(cartItems).select()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error bulk adding to cart:', error)
    throw new Error(error.message || '장바구니에 담는데 실패했습니다')
  }
}

/**
 * 사용자의 장바구니 목록 조회
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Array>} 장바구니 항목들
 */
export async function fetchCart(userId) {
  try {
    const { data, error } = await supabase
      .from('cart_items')
      .select(
        `
        cart_item_id,
        quantity,
        selected_options,
        created_at,
        products (
          product_id,
          product_name,
          brand_name,
          price,
          original_price,
          thumbnail_url,
          is_sold_out,
          has_options,
          is_free_shipping,
          is_today_shipping
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // 데이터 변환
    return data.map((item) => ({
      cartItemId: item.cart_item_id,
      quantity: item.quantity,
      selectedOptions: item.selected_options ? JSON.parse(item.selected_options) : null,
      addedAt: item.created_at,
      productId: item.products.product_id,
      productName: item.products.product_name,
      brandName: item.products.brand_name,
      price: item.products.price,
      originalPrice: item.products.original_price,
      thumbnailUrl: item.products.thumbnail_url,
      isSoldOut: item.products.is_sold_out,
      hasOptions: item.products.has_options,
      isFreeShipping: item.products.is_free_shipping,
      isTodayShipping: item.products.is_today_shipping,
    }))
  } catch (error) {
    console.error('Error fetching cart:', error)
    throw new Error(error.message || '장바구니를 불러오는데 실패했습니다')
  }
}

/**
 * 장바구니 항목 수량 변경
 * @param {string} cartItemId - 장바구니 항목 ID
 * @param {number} quantity - 변경할 수량
 * @returns {Promise<Object>} 업데이트된 항목
 */
export async function updateCartQuantity(cartItemId, quantity) {
  try {
    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('cart_item_id', cartItemId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating cart quantity:', error)
    throw new Error(error.message || '수량 변경에 실패했습니다')
  }
}

/**
 * 장바구니에서 항목 제거
 * @param {string} cartItemId - 장바구니 항목 ID
 * @returns {Promise<void>}
 */
export async function removeFromCart(cartItemId) {
  try {
    const { error } = await supabase.from('cart_items').delete().eq('cart_item_id', cartItemId)

    if (error) throw error
  } catch (error) {
    console.error('Error removing from cart:', error)
    throw new Error(error.message || '장바구니에서 제거하는데 실패했습니다')
  }
}

/**
 * 장바구니에서 여러 항목 제거
 * @param {Array<string>} cartItemIds - 장바구니 항목 ID 배열
 * @returns {Promise<void>}
 */
export async function bulkRemoveFromCart(cartItemIds) {
  try {
    const { error } = await supabase.from('cart_items').delete().in('cart_item_id', cartItemIds)

    if (error) throw error
  } catch (error) {
    console.error('Error bulk removing from cart:', error)
    throw new Error(error.message || '장바구니에서 제거하는데 실패했습니다')
  }
}

/**
 * 사용자의 장바구니 전체 비우기
 * @param {string} userId - 사용자 ID
 * @returns {Promise<void>}
 */
export async function clearCart(userId) {
  try {
    const { error } = await supabase.from('cart_items').delete().eq('user_id', userId)

    if (error) throw error
  } catch (error) {
    console.error('Error clearing cart:', error)
    throw new Error(error.message || '장바구니를 비우는데 실패했습니다')
  }
}
