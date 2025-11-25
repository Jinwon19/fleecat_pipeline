// src/lib/api.js
import { toastLoading, toastErr } from './toast'

/**
 * 공통 요청 함수
 * - fetch(url, options) 래핑
 * - JSON 응답 자동 파싱 (실패 시 null)
 * - 에러 메시지 추출(data.error || data.message || HTTP code)
 * - 토스트는 옵션으로 제어
 */
export async function request(url, options = {}, toastOpt = null) {
  const run = async () => {
    const res = await fetch(url, options)
    const data = await res.json().catch(() => null)

    if (!res.ok) {
      const msg = data?.error || data?.message || `HTTP ${res.status}`
      const err = new Error(msg)
      err.status = res.status
      err.data = data
      throw err
    }
    return data
  }

  try {
    if (toastOpt) {
      // { loading, success, error } 제공 시 토스트 감싸기
      return await toastLoading(run(), toastOpt)
    }
    return await run()
  } catch (err) {
    // 호출자가 별도로 처리하고 싶으면 여기서 토스트 생략 가능
    if (!toastOpt) {
      // 토스트 안 썼다면 기본적으로 에러 토스트 한 번
      toastErr(err)
    }
    throw err
  }
}

/** 편의 메서드 */
export const api = {
  get: (url, toastOpt) => request(url, { method: 'GET' }, toastOpt),
  del: (url, toastOpt) => request(url, { method: 'DELETE' }, toastOpt),
  post: (url, body, toastOpt) =>
    request(
      url,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      toastOpt
    ),
  patch: (url, body, toastOpt) =>
    request(
      url,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      toastOpt
    ),
}

/** (선택) 타임아웃 헬퍼 */
export function withTimeout(ms, p) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('요청 시간이 초과되었습니다')), ms)
    p.then(v => { clearTimeout(t); resolve(v) })
     .catch(e => { clearTimeout(t); reject(e) })
  })
}
