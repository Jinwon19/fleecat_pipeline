// 다음 우편번호 타입 정의
declare global {
  interface Window {
    daum?: {
      Postcode: new (config: PostcodeConfig) => PostcodeInstance
    }
  }
}

interface PostcodeConfig {
  oncomplete: (data: PostcodeResult) => void
  width?: string | number
  height?: string | number
}

interface PostcodeInstance {
  open: () => void
}

// 우편번호 검색 결과 타입
export interface PostcodeResult {
  zonecode: string // 우편번호
  address: string // 기본 주소
  addressEnglish: string // 영문 주소
  addressType: 'R' | 'J' // R: 도로명, J: 지번
  bname: string // 법정동/법정리 이름
  buildingName: string // 건물명
}

// 다음 우편번호 스크립트 동적 로드
export function loadDaumPostcodeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.daum && window.daum.Postcode) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('우편번호 스크립트 로드 실패'))
    document.head.appendChild(script)
  })
}

// 우편번호 검색 팝업 열기
export function openPostcodePopup(
  onComplete: (data: PostcodeResult) => void
): void {
  loadDaumPostcodeScript().then(() => {
    if (window.daum?.Postcode) {
      new window.daum.Postcode({
        oncomplete: onComplete,
        width: '100%',
        height: '100%'
      }).open()
    }
  }).catch((error) => {
    console.error('우편번호 검색 실패:', error)
    alert('우편번호 검색 서비스를 불러올 수 없습니다.')
  })
}

// 우편번호 결과를 폼 필드로 매핑
export function mapPostcodeResult(data: PostcodeResult) {
  return {
    member_address_zipcode: data.zonecode,
    member_address_address1: data.address
  }
}
