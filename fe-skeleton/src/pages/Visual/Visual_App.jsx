import Header from '../../components/Header';
import BodyHeader from '../../components/BodyHeader';
import Visual from './Visual.jsx';

// CSS imports
import '../../styles/Layout.css';
import '../Home/Home.css';
import './Visual.css';

function Visual_App() {
  return (
    <div className="layout">

      <main className="layout__main">
        <div className="wrap">
        
          {/* 지도 시각화 섹션 */}
          <div className="visual-map-section">
            <h2 className="visual-map-title">📍 플리마켓 지도 시각화</h2>
            <Visual />
          </div>
        </div>
      </main>
    </div>
  );
}

export default Visual_App;