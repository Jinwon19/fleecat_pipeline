import { MainBanner } from './MainBanner/MainBanner'
import { CategoryGrid } from './CategoryGrid/CategoryGrid'
import { ProductSection } from './ProductSection/ProductSection'
import './Home.css'

export default function Home() {
  return (
    <div className="wrap">
      <MainBanner />
      <CategoryGrid />
      <ProductSection />
    </div>
  )
}
