import { Leaf, Shield, Droplets, Package } from 'lucide-react'

export function ProductFeatures({ features }) {
  // 기본 특징 (features prop이 없을 경우)
  const defaultFeatures = [
    {
      icon: <Leaf size={32} />,
      title: '친환경 소재',
      description: '재활용 가능한 친환경 소재로 제작되었습니다'
    },
    {
      icon: <Shield size={32} />,
      title: '내구성',
      description: '튼튼한 이중 봉제로 오래 사용할 수 있습니다'
    },
    {
      icon: <Droplets size={32} />,
      title: '세탁 가능',
      description: '손세탁 및 기계세탁 모두 가능합니다'
    },
    {
      icon: <Package size={32} />,
      title: '넉넉한 수납',
      description: 'A4 서류, 15인치 노트북까지 수납 가능합니다'
    }
  ]

  const displayFeatures = features || defaultFeatures

  return (
    <section className="product-features">
      <h2 className="product-features__title">제품 특징</h2>
      <div className="product-features__grid">
        {displayFeatures.map((feature, index) => (
          <div key={index} className="product-features__item">
            <div className="product-features__icon">
              {feature.icon}
            </div>
            <h3 className="product-features__item-title">{feature.title}</h3>
            <p className="product-features__item-description">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
