import {
  Sparkles,
  Users,
  User,
  Zap,
  Shirt,
  Square,
  Star
} from "lucide-react";
import "./CategoryGrid.css";
import AccessoriesIcon from "../../../assets/Accessories.png";
import InteriorIcon from "../../../assets/Interior.png";

const categories = [
  { id: 1, name: "신상품", icon: Sparkles, color: "pink" },
  { id: 2, name: "장식", icon: InteriorIcon, color: "red", isImage: true },
  { id: 3, name: "남성 의류", icon: Users, color: "blue" },
  { id: 4, name: "여성 의류", icon: User, color: "purple" },
  { id: 5, name: "아우터", icon: Zap, color: "green" },
  { id: 6, name: "상의", icon: Shirt, color: "orange" },
  { id: 7, name: "하의", icon: Square, color: "indigo" },
  { id: 8, name: "액세서리", icon: AccessoriesIcon, color: "yellow", isImage: true },
  { id: 9, name: "추천 상품", icon: Star, color: "amber" }
];

export function CategoryGrid() {
  return (
    <section className="category-section">
      <div className="category-container">
        <div className="category-scroll-wrapper">
          <div className="category-grid">
            {categories.map((category) => {
              const IconComponent = category.icon;

              return (
                <div
                  key={category.id}
                  className="category-item"
                >
                  <div className={`category-icon-wrapper ${category.color}`}>
                    {category.isImage ? (
                      <img
                        src={category.icon}
                        alt={category.name}
                        className="category-icon-image"
                      />
                    ) : (
                      <IconComponent className="category-icon" />
                    )}
                  </div>
                  <span className="category-name">
                    {category.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}