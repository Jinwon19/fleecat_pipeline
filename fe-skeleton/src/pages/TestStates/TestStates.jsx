import { useState } from 'react'
import { ShoppingBag, Package, X } from 'lucide-react'
import ErrorState from '../../components/ErrorState'
import EmptyState from '../../components/EmptyState'
import SkeletonList from '../../components/SkeletonList'
import './TestStates.css'

/**
 * Test States Page
 * Demonstrates all common state components
 */
function TestStates() {
  const [showSkeletons, setShowSkeletons] = useState(false)

  return (
    <div className="test-states-page">
      <header className="test-states-header">
        <h1>공통 상태 컴포넌트 테스트</h1>
        <p>ErrorState, EmptyState, SkeletonList 컴포넌트를 확인합니다</p>
      </header>

      <div className="test-states-grid">
        {/* ErrorState Variants */}
        <section className="test-section">
          <h2>1. ErrorState - Generic</h2>
          <div className="component-demo">
            <ErrorState
              title="문제가 발생했습니다"
              message="요청을 처리하는 중 오류가 발생했습니다."
              variant="generic"
              onRetry={() => alert('다시 시도!')}
            />
          </div>
        </section>

        <section className="test-section">
          <h2>2. ErrorState - Network</h2>
          <div className="component-demo">
            <ErrorState
              title="네트워크 연결 실패"
              message="인터넷 연결을 확인해주세요."
              variant="network"
              onRetry={() => alert('다시 시도!')}
            />
          </div>
        </section>

        <section className="test-section">
          <h2>3. ErrorState - Server</h2>
          <div className="component-demo">
            <ErrorState
              title="서버 오류"
              message="서버에서 응답이 없습니다. 잠시 후 다시 시도해주세요."
              variant="server"
              onRetry={() => alert('다시 시도!')}
            />
          </div>
        </section>

        <section className="test-section">
          <h2>4. ErrorState - Not Found</h2>
          <div className="component-demo">
            <ErrorState
              title="페이지를 찾을 수 없습니다"
              message="요청하신 페이지가 존재하지 않습니다."
              variant="notfound"
            />
          </div>
        </section>

        {/* EmptyState Variants */}
        <section className="test-section">
          <h2>5. EmptyState - Default</h2>
          <div className="component-demo">
            <EmptyState
              title="데이터가 없습니다"
              message="아직 표시할 내용이 없습니다."
            />
          </div>
        </section>

        <section className="test-section">
          <h2>6. EmptyState - With Action</h2>
          <div className="component-demo">
            <EmptyState
              title="주문 내역이 없습니다"
              message="첫 주문을 시작해보세요!"
              icon={<ShoppingBag size={48} strokeWidth={1.5} />}
              action={{
                label: '쇼핑하러 가기',
                onClick: () => alert('쇼핑 페이지로 이동!')
              }}
            />
          </div>
        </section>

        <section className="test-section">
          <h2>7. EmptyState - Custom Icon</h2>
          <div className="component-demo">
            <EmptyState
              title="배송 중인 상품이 없습니다"
              message="모든 상품이 배송 완료되었습니다."
              icon={<Package size={48} strokeWidth={1.5} />}
            />
          </div>
        </section>

        {/* SkeletonList Variants */}
        <section className="test-section">
          <h2>8. SkeletonList - Card</h2>
          <div className="component-demo">
            <button
              className="toggle-btn"
              onClick={() => setShowSkeletons(!showSkeletons)}
            >
              {showSkeletons ? '숨기기' : '보이기'}
            </button>
            {showSkeletons && (
              <SkeletonList count={3} variant="card" height="150px" />
            )}
          </div>
        </section>

        <section className="test-section">
          <h2>9. SkeletonList - List</h2>
          <div className="component-demo">
            {showSkeletons && (
              <SkeletonList count={5} variant="list" height="80px" />
            )}
          </div>
        </section>

        <section className="test-section">
          <h2>10. SkeletonList - Table</h2>
          <div className="component-demo">
            {showSkeletons && (
              <SkeletonList count={4} variant="table" height="60px" />
            )}
          </div>
        </section>
      </div>

      <div className="test-info">
        <h3>접근성 체크리스트:</h3>
        <ul>
          <li>✅ ErrorState: role="alert", aria-live="assertive"</li>
          <li>✅ SkeletonList: aria-busy="true", aria-label="로딩 중"</li>
          <li>✅ 모든 아이콘: aria-hidden="true"</li>
          <li>✅ 버튼: focus-visible 스타일 적용</li>
          <li>✅ prefers-reduced-motion 미디어 쿼리 적용</li>
          <li>✅ 반응형 디자인 적용 (모바일 최적화)</li>
        </ul>

        <h3>테스트 방법:</h3>
        <ul>
          <li>🔍 브라우저 개발자 도구에서 접근성 트리 확인</li>
          <li>⌨️ Tab 키로 포커스 이동 확인</li>
          <li>📱 반응형 레이아웃 확인 (모바일/태블릿/데스크탑)</li>
          <li>🌓 다크모드 토글 시 색상 확인</li>
          <li>⚡ 애니메이션 비활성화 설정 시 동작 확인</li>
        </ul>
      </div>
    </div>
  )
}

export default TestStates
