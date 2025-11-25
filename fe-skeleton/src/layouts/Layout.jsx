// src/layouts/Layout.jsx
import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import BodyHeader from '../components/BodyHeader'
import '../styles/Layout.css'

export default function Layout() {
  return (
    <div className="layout">
      {/* Skip Links */}
      <a href="#main-content" className="skip-link">
        본문으로 건너뛰기
      </a>

      <Header />
      <BodyHeader />

      <main id="main-content" className="layout__main" role="main">
        <div className="wrap">
          <Outlet />
        </div>
      </main>

      <footer className="layout__footer" role="contentinfo">
        <div className="wrap">
          © FE Skeleton
        </div>
      </footer>
    </div>
  )
}
