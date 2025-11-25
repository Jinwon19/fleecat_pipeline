import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import '../../styles/Layout.css'
import './BodyHeader.css'
import saveIcon from '../../assets/save.png'
import myInfoIcon from '../../assets/my-info.png'
import cartIcon from '../../assets/cart.png'
import listIcon from '../../assets/list.png'

// 카테고리 데이터
const categories = {
  "패션·의류·잡화": {
    "의류": ["상의", "하의", "원피스·점프슈트"],
    "패션잡화": ["가방·파우치", "모자·헤어밴드", "양말·스타킹·타이츠", "머플러·스카프·넥타이", "벨트·서스펜더"],
    "액세서리": ["귀걸이·이어커프", "목걸이·펜던트", "팔찌·발찌", "반지", "브로치·뱃지", "헤어핀·헤어밴드"]
  },
  "뷰티·향": {
    "핸드·바디": ["핸드크림", "바디로션·오일", "비누·솝"],
    "립·페이스": ["립밤", "틴티드밤"],
    "향": ["디퓨저", "룸스프레이", "향초(캔들)", "왁스탑"],
    "뷰티소품": ["파우치", "브러시케이스", "비누받침"]
  },
  "홈데코·리빙": {
    "섬유데코": ["쿠션·방석", "담요·러그", "커튼·패브릭포스터"],
    "인테리어소품": ["오브제", "무드등·조명셰이드", "모빌"],
    "수납·정리": ["바스켓·트레이", "훅·행거", "소품정리함"],
    "생활소품": ["코스터", "티슈케이스", "키캡·자석"]
  },
  "주방·테이블웨어": {
    "식기": ["머그·컵", "접시", "볼·면기", "디저트플레이트"],
    "커트러리": ["수저·포크·나이프", "티스푼", "집게"],
    "키친패브릭": ["앞치마", "키친타월", "냄비받침"],
    "주방소품": ["보관용기", "도마", "티팟·드리퍼"]
  },
  "문구·일러스트": {
    "문구": ["펜·연필", "노트·다이어리", "스티커·씰"],
    "일러스트": ["엽서·카드", "포스터", "굿즈"]
  },
  "빈티지·리세일·업사이클": {
    "의류·패션": ["빈티지의류", "리폼의류", "업사이클액세서리"],
    "리빙·소품": ["빈티지그릇", "오브제·장식", "수집품"],
    "소재·파츠": ["리메이크원단", "단추·지퍼", "금속파츠"],
    "한정·아카이브": ["아카이브굿즈", "데드스톡"]
  }
}

export default function BodyHeader() {
  const [activeCategory, setActiveCategory] = useState(Object.keys(categories)[0])

  return (
    <nav className="body-header" role="navigation" aria-label="주요 메뉴">
      <div className="wrap">
        <div className="body-header__inner">
          {/* 왼쪽: 로고 및 카테고리 */}
          <div className="body-header__left">
            <div className="body-header__logo">
              <NavLink to="/" className="body-header__logo-link">
                FLEECAT
              </NavLink>
            </div>

            {/* 카테고리 메뉴 */}
            <div className="body-header__categories">
              <div className="category-dropdown">
                <NavLink to="/products" className="body-header__category-link">
                  <img src={listIcon} alt="전체보기" className="body-header__category-icon" />
                  <span className="body-header__category-text">전체보기</span>
                </NavLink>

                {/* 드롭다운 메뉴 */}
                <div className="category-dropdown__menu">
                  {/* 좌측 대분류 메뉴 */}
                  <div className="category-dropdown__sidebar">
                    {Object.keys(categories).map((mainCategory) => (
                      <div
                        key={mainCategory}
                        className={`category-dropdown__main-item ${activeCategory === mainCategory ? 'active' : ''}`}
                        onMouseEnter={() => setActiveCategory(mainCategory)}
                      >
                        {mainCategory}
                      </div>
                    ))}
                  </div>

                  {/* 우측 중분류/소분류 내용 */}
                  <div className="category-dropdown__content">
                    {Object.entries(categories).map(([mainCategory, subCategories]) => (
                      <div
                        key={mainCategory}
                        className={`category-dropdown__details ${activeCategory === mainCategory ? 'active' : ''}`}
                      >
                        <div className="category-dropdown__columns">
                          {Object.entries(subCategories).map(([subCategory, items]) => (
                            <div key={subCategory} className="category-dropdown__column">
                              <h4 className="category-dropdown__sub-title">{subCategory}</h4>
                              <div className="category-dropdown__items">
                                {items.map((item) => (
                                  <NavLink
                                    key={item}
                                    to={`/products?category=${encodeURIComponent(mainCategory)}&sub=${encodeURIComponent(subCategory)}&item=${encodeURIComponent(item)}`}
                                    className="category-dropdown__link"
                                  >
                                    {item}
                                  </NavLink>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 중앙: 검색바 */}
          <div className="body-header__search" role="search">
            <input
              type="text"
              placeholder="상품을 검색해보세요"
              className="body-header__search-input"
              aria-label="상품 검색"
            />
          </div>

          {/* 오른쪽: 찜, 내 정보, 장바구니 */}
          <div className="body-header__nav">
            <NavLink to="/wishlist" className="body-header__nav-link">
              <img src={saveIcon} alt="찜" className="body-header__nav-icon" />
              <span className="body-header__nav-text">찜</span>
            </NavLink>
            <NavLink to="/account" className="body-header__nav-link">
              <img src={myInfoIcon} alt="내 정보" className="body-header__nav-icon" />
              <span className="body-header__nav-text">내 정보</span>
            </NavLink>
            <NavLink to="/cart" className="body-header__nav-link">
              <img src={cartIcon} alt="장바구니" className="body-header__nav-icon" />
              <span className="body-header__nav-text">장바구니</span>
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  )
}