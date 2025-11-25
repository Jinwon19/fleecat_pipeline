# FleeCat Frontend 🗺️

> React 19 + Vite 기반의 플리마켓 지도 시각화 프론트엔드

플리마켓 데이터를 **Kakao Maps API**로 시각화하고, Supabase에서 실시간으로 데이터를 불러와 표시하는 React 애플리케이션입니다.

---

## 🌟 주요 기능

### 1. 카카오맵 지도 시각화
- **Kakao Maps JavaScript API** 통합
- 100+ 마커를 마커 클러스터링으로 성능 최적화
- 마커 클릭 시 플리마켓 상세 정보 표시

### 2. 날짜 범위 필터링
- 커스텀 캘린더 컴포넌트
- 시작일~종료일 범위 선택
- 선택한 기간에 해당하는 플리마켓만 지도에 표시

### 3. 지오코딩 캐싱
- Kakao Local API로 주소 → 좌표 변환
- 변환 결과를 로컬 캐시에 저장하여 API 호출 최소화
- 빠른 지도 렌더링

### 4. Supabase 실시간 데이터
- Supabase PostgreSQL에서 플리마켓 데이터 조회
- REST API를 통한 실시간 데이터 업데이트

---

## 🛠️ 기술 스택

- **Framework**: React 19
- **Build Tool**: Vite 5.x
- **Maps**: Kakao Maps JavaScript API
- **Backend**: Supabase (PostgreSQL)
- **State Management**: React Context API
- **Icons**: Lucide React
- **Styling**: CSS Modules

---

## 📂 프로젝트 구조

```
fe-skeleton/
├── src/
│   ├── pages/
│   │   └── Visual/
│   │       ├── Visual.jsx         # 메인 지도 컴포넌트
│   │       └── Visual.css         # 스타일시트
│   ├── lib/
│   │   └── supabaseClient.js      # Supabase 클라이언트 설정
│   ├── contexts/
│   │   └── AuthContext.jsx        # 인증 컨텍스트
│   ├── components/                # 공통 컴포넌트
│   ├── layouts/                   # 레이아웃
│   └── main.jsx                   # 앱 진입점
├── public/
├── index.html
├── vite.config.js                 # Vite 설정
└── package.json
```

---

## 🚀 실행 방법

### 사전 요구사항
- Node.js 18+
- Kakao Developers 계정 (Maps API 키)
- Supabase 계정 및 프로젝트

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 복사하여 `.env` 파일 생성:

```bash
cp .env.example .env
```

`.env` 파일에 다음 정보 입력:

```env
# Kakao Maps API
VITE_KAKAO_MAP_KEY=your_kakao_javascript_key_here

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. 개발 서버 시작

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

### 4. 지도 페이지 확인

`http://localhost:5173/visual` 접속하여 플리마켓 지도 확인

---

## 🗺️ Visual 페이지 사용 방법

### 지도 조작
- **마커 클릭**: 플리마켓 상세 정보 표시 (이름, 장소, 날짜, 시간)
- **마커 클러스터**: 여러 마커가 모여있을 때 숫자로 표시, 클릭하면 확대
- **지도 이동**: 드래그로 이동, 스크롤로 줌 인/아웃

### 날짜 필터링
1. 상단의 **"날짜 선택"** 버튼 클릭
2. 캘린더에서 **시작일** 선택
3. **종료일** 선택
4. 선택한 기간의 플리마켓만 지도에 표시됨
5. "초기화" 버튼으로 전체 데이터 다시 표시

---

## 📦 주요 컴포넌트

### Visual.jsx
메인 지도 시각화 컴포넌트

**기능:**
- Kakao Maps API 초기화
- Supabase에서 플리마켓 데이터 로드
- 마커 생성 및 클러스터링
- 날짜 필터링 로직

**주요 훅:**
```jsx
const [marketData, setMarketData] = useState([]);      // 전체 데이터
const [filteredData, setFilteredData] = useState([]);  // 필터링된 데이터
const [selectedMarker, setSelectedMarker] = useState(null); // 선택된 마커
const [startDate, setStartDate] = useState("");        // 시작일
const [endDate, setEndDate] = useState("");            // 종료일
```

### Calendar Component
커스텀 캘린더 컴포넌트

**기능:**
- 월별 달력 표시
- 날짜 범위 선택
- 선택한 날짜 하이라이트

---

## 🔧 API 연동

### Supabase 데이터 조회

```javascript
import { supabase } from '../lib/supabaseClient';

// 플리마켓 데이터 조회
const { data, error } = await supabase
  .from('markets')
  .select(`
    *,
    sessions(*)
  `);
```

### Kakao Maps 지오코딩

```javascript
const geocoder = new kakao.maps.services.Geocoder();

geocoder.addressSearch(address, (result, status) => {
  if (status === kakao.maps.services.Status.OK) {
    const { x: lng, y: lat } = result[0];
    // 좌표 사용
  }
});
```

---

## 📊 성능 최적화

### 마커 클러스터링
```javascript
const clusterer = new kakao.maps.MarkerClusterer({
  map: kakaoMapRef.current,
  averageCenter: true,
  minLevel: 5,
  calculator: [10, 30, 50],
  styles: [/* 클러스터 스타일 */]
});
```

### 지오코딩 캐싱
- 이미 변환한 주소는 로컬 스토리지에 저장
- 중복 API 호출 방지
- 100+ 마커도 빠르게 렌더링

---

## 🎨 스타일 커스터마이징

`Visual.css`에서 다음을 수정 가능:

```css
/* 지도 컨테이너 크기 */
#map {
  width: 100%;
  height: calc(100vh - 80px);
}

/* 마커 정보창 스타일 */
.custom-overlay {
  background: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* 캘린더 스타일 */
.calendar-container {
  /* 커스텀 스타일 */
}
```

---

## 🐛 문제 해결

### Kakao Maps가 로드되지 않을 때
1. `.env` 파일에 `VITE_KAKAO_MAP_KEY`가 올바르게 설정되었는지 확인
2. Kakao Developers에서 웹 플랫폼이 등록되어 있는지 확인
3. 브라우저 콘솔에서 에러 메시지 확인

### Supabase 데이터가 안 나올 때
1. `.env` 파일의 Supabase URL과 Anon Key 확인
2. Supabase 대시보드에서 `markets`, `sessions` 테이블이 존재하는지 확인
3. Row Level Security (RLS) 정책 확인

### 지오코딩 실패 시
- Kakao Local API 키 확인
- 주소 형식 확인 (정확한 주소 필요)
- API 할당량 초과 여부 확인

---

## 🔮 향후 개선 계획

- [ ] TypeScript 마이그레이션
- [ ] 반응형 디자인 개선 (모바일 최적화)
- [ ] 마커 아이콘 커스터마이징
- [ ] 길 찾기 기능 추가
- [ ] 플리마켓 검색 기능
- [ ] 즐겨찾기 기능

---

## 📝 라이선스

MIT License

---

## 👥 기여

이슈 및 PR 환영합니다!

---

**개발 환경**: Node.js 18+, React 19, Vite 5.x
**빌드 도구**: Vite (Fast HMR, ES Modules)
**Maps SDK**: Kakao Maps JavaScript API v3
