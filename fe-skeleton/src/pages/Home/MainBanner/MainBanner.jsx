import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { ChevronLeft, ChevronRight } from "lucide-react";
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import "./MainBanner.css";
import OfflineMarket from "../../../assets/Offline-Market.png";
import OfflineOneday from "../../../assets/Offline-Oneday.png";

const banners = [
  {
    id: 1,
    image: OfflineMarket,
    title: "",
    subtitle: "",
    link: "/visual"
  },
  {
    id: 2,
    image: OfflineOneday,
    title: "",
    subtitle: "",
    link: "/oneday"
  }
];

export function MainBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const swiperRef = useRef(null);
  const navigate = useNavigate();

  const handleBannerClick = (banner) => {
    if (banner.link.startsWith('/')) {
      navigate(banner.link);
    } else {
      window.open(banner.link, '_blank');
    }
  };

  return (
    <section className="banner-section">
      <button
        className="banner-nav-btn banner-nav-prev"
        onClick={() => swiperRef.current?.slidePrev()}
      >
        <ChevronLeft className="banner-nav-icon" />
      </button>

      <div className="banner-container">
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          slidesPerView={1}
          centeredSlides={true}
          spaceBetween={16}
          loop={true}
          speed={500}
          autoplay={{
            delay: 4000,
            disableOnInteraction: false,
            pauseOnMouseEnter: false,
          }}
          onSwiper={(swiper) => { swiperRef.current = swiper; }}
          onSlideChange={(swiper) => setCurrentSlide(swiper.realIndex)}
          className="banner-swiper"
        >
          {banners.map((banner) => (
            <SwiperSlide key={banner.id} className="banner-slide">
              <div
                className="banner-slide-content"
                onClick={() => handleBannerClick(banner)}
              >
                <img
                  src={banner.image}
                  alt={banner.title}
                  className="banner-image"
                />
                <div className="banner-overlay" />
                <div className="banner-content">
                  <h2 className="banner-title">{banner.title}</h2>
                  <p className="banner-subtitle">{banner.subtitle}</p>
                </div>
              </div>
            </SwiperSlide>
          ))}

          {/* Page indicator */}
          <div className="banner-page-indicator">
            {String(currentSlide + 1).padStart(2, '0')}/{String(banners.length).padStart(2, '0')}
          </div>
        </Swiper>
      </div>

      <button
        className="banner-nav-btn banner-nav-next"
        onClick={() => swiperRef.current?.slideNext()}
      >
        <ChevronRight className="banner-nav-icon" />
      </button>
    </section>
  );
}
