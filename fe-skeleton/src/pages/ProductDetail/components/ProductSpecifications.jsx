import { Info, MapPin, Phone, Award } from 'lucide-react'

export function ProductSpecifications({ specifications }) {
  // 기본 상품 고시 정보 (specifications prop이 없을 경우)
  const defaultSpecs = {
    제품명: '플리캣 에코백',
    제조국: '대한민국',
    제조사: '플리캣 주식회사',
    '소재/재질': '친환경 캔버스 100%',
    크기: '가로 35cm × 세로 40cm × 깊이 10cm',
    '세탁방법 및 취급시 주의사항': '손세탁 및 기계세탁 가능 (중성세제 사용), 표백제 사용 금지, 그늘 건조 권장',
    '품질보증기준': '제품 수령 후 7일 이내 교환 및 환불 가능 (단, 제품 하자 시 무상 교환)',
    'A/S 책임자 및 연락처': '플리캣 고객센터 / 1588-0000',
    '안전확인신고번호': 'KC인증 면제 품목'
  }

  const displaySpecs = specifications || defaultSpecs

  // 상품 고시 정보를 배열로 변환
  const specsList = Object.entries(displaySpecs).map(([key, value]) => ({
    label: key,
    value: value
  }))

  return (
    <section className="product-specifications">
      <div className="product-specifications__header">
        <Info className="product-specifications__header-icon" size={24} />
        <h2 className="product-specifications__title">상품 고시 정보</h2>
      </div>

      <div className="product-specifications__content">
        <table className="product-specifications__table">
          <tbody>
            {specsList.map((spec, index) => (
              <tr key={index} className="product-specifications__row">
                <th className="product-specifications__label">
                  {spec.label}
                </th>
                <td className="product-specifications__value">
                  {spec.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="product-specifications__notice">
        <div className="product-specifications__notice-item">
          <MapPin className="product-specifications__notice-icon" size={16} />
          <span>전자상거래 등에서의 상품정보제공 고시에 따른 표기사항입니다.</span>
        </div>
        <div className="product-specifications__notice-item">
          <Phone className="product-specifications__notice-icon" size={16} />
          <span>자세한 정보는 고객센터로 문의해주세요.</span>
        </div>
        <div className="product-specifications__notice-item">
          <Award className="product-specifications__notice-icon" size={16} />
          <span>소비자분쟁해결기준(공정거래위원회 고시)에 따라 처리됩니다.</span>
        </div>
      </div>
    </section>
  )
}
