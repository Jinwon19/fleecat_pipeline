// src/utils/cart.js

// 로컬스토리지 키
const KEY = "cart"

// 장바구니 가져오기
export function getCart() {
  try {
    const cart = localStorage.getItem(KEY)
    return cart ? JSON.parse(cart) : []
  } catch {
    return []
  }
}

// 장바구니 저장하기 (내부용)
function setCart(items) {
  localStorage.setItem(KEY, JSON.stringify(items))
}

// 수량 1개씩 추가 (간단 버전)
export function addToCart(product) {
  const cart = getCart()
  const exists = cart.find(item => item.id === product.id)

  if (exists) {
    exists.quantity += 1
  } else {
    cart.push({ ...product, quantity: 1 })
  }

  setCart(cart)
}

// 원하는 수량만큼 추가 (추천: ProductDetail에서 사용)
export function addToLocalCart(product, qty = 1) {
  const cart = getCart()
  const exists = cart.find(item => item.id === product.id)

  if (exists) {
    exists.quantity += qty
  } else {
    cart.push({ ...product, quantity: qty })
  }

  setCart(cart)
}

// 상품 제거
export function removeFromCart(productId) {
  const cart = getCart().filter(item => item.id !== productId)
  setCart(cart)
}

// 장바구니 전체 비우기
export function clearCart() {
  localStorage.removeItem(KEY)
}
