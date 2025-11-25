import React, { useState, useEffect, useRef } from "react";
import "./Visual.css";

// ✅ 달력 컴포넌트
function Calendar({ startDate, endDate, onDateClick }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    return { daysInMonth, startDayOfWeek, year, month };
  };

  const { daysInMonth, startDayOfWeek, year, month } = getDaysInMonth(currentMonth);

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1));
  };

  const formatDate = (day) => {
    const date = new Date(year, month, day);
    return date.toISOString().split('T')[0];
  };

  const isInRange = (day) => {
    if (!startDate || !endDate) return false;
    const date = formatDate(day);
    return date >= startDate && date <= endDate;
  };

  const isSelected = (day) => {
    const date = formatDate(day);
    return date === startDate || date === endDate;
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button onClick={prevMonth} className="calendar-nav-button">‹</button>
        <span className="calendar-month">{year}년 {month + 1}월</span>
        <button onClick={nextMonth} className="calendar-nav-button">›</button>
      </div>

      <div className="calendar-weekdays">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <div key={day} className="calendar-weekday">{day}</div>
        ))}
      </div>

      <div className="calendar-days">
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="calendar-day empty"></div>
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = formatDate(day);

          return (
            <button
              key={day}
              className={`calendar-day
                ${isSelected(day) ? 'selected' : ''}
                ${isInRange(day) ? 'in-range' : ''}
              `}
              onClick={() => onDateClick(dateStr)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 메인 컴포넌트
export default function Visual() {
  const mapRef = useRef(null); // 지도 DOM 요소
  const kakaoMapRef = useRef(null); // 카카오맵 인스턴스
  const markersRef = useRef([]); // 마커 배열
  const clustererRef = useRef(null); // 클러스터러 인스턴스

  const [marketData, setMarketData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [selectedClusterMarkers, setSelectedClusterMarkers] = useState([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectingDate, setSelectingDate] = useState(null);

  // ✅ Geocoding 캐시 (백엔드 API 호출 결과 캐싱)
  const geocodeCache = useRef(new Map());

  // ✅ 유틸리티 함수: 날짜 범위 포맷팅
  const formatDateRange = (dateList) => {
    if (!dateList || dateList.length === 0) return '날짜 미정';

    const sorted = [...dateList].sort();
    if (sorted.length === 1) return sorted[0];

    const ranges = [];
    let rangeStart = sorted[0];
    let rangeEnd = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const current = new Date(sorted[i]);
      const prev = new Date(sorted[i - 1]);
      const diffDays = (current - prev) / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        // 연속된 날짜
        rangeEnd = sorted[i];
      } else {
        // 불연속 - 현재 범위 저장
        if (rangeStart === rangeEnd) {
          ranges.push(rangeStart);
        } else {
          ranges.push(`${rangeStart} ~ ${rangeEnd}`);
        }
        rangeStart = sorted[i];
        rangeEnd = sorted[i];
      }
    }

    // 마지막 범위 저장
    if (rangeStart === rangeEnd) {
      ranges.push(rangeStart);
    } else {
      ranges.push(`${rangeStart} ~ ${rangeEnd}`);
    }

    return ranges.join(', ');
  };

  // ✅ 유틸리티 함수: 시간 포맷팅 (시작~종료 시간 처리)
  const formatTime = (timeStr) => {
    if (!timeStr || timeStr === '시간 미정') return '시간 미정';

    // "14:30:00 ~ 16:00:00" 형식 처리 (시작~종료)
    if (timeStr.includes('~')) {
      const [start, end] = timeStr.split('~').map(t => t.trim());
      const formatSingle = (time) => {
        const parts = time.split(':');
        return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
      };
      return `${formatSingle(start)} ~ ${formatSingle(end)}`;
    }

    // "14:30부터", "16:00까지" 형식 처리
    if (timeStr.includes('부터') || timeStr.includes('까지')) {
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        const formattedTime = `${parts[0]}:${parts[1]}`;
        // "부터"나 "까지" 텍스트 보존
        if (timeStr.includes('부터')) {
          return `${formattedTime}부터`;
        } else {
          return `${formattedTime}까지`;
        }
      }
      return timeStr;
    }

    // 단일 시간 처리 "14:30:00" → "14:30"
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }

    return timeStr;
  };


  // ✅ 카카오맵 초기화
  useEffect(() => {
    if (!window.kakao || !window.kakao.maps) {
      console.error("❌ 카카오맵 API가 로드되지 않았습니다.");
      return;
    }

    // 지도 생성 (전국 범위, 향후 지역 필터 기능 추가 예정)
    const container = mapRef.current;
    const options = {
      center: new window.kakao.maps.LatLng(36.5, 127.5), // 대한민국 중심
      level: 13, // 확대 레벨 (1-14, 숫자가 클수록 넓은 범위)
      draggable: true, // 드래그 활성화
      scrollwheel: true, // 마우스 휠 줠 활성화
      disableDoubleClick: false, // 더블클릭 활성화
      disableDoubleClickZoom: false, // 더블클릭 줌 활성화
    };

    const map = new window.kakao.maps.Map(container, options);
    kakaoMapRef.current = map;

    // 줌 컨트롤 추가
    const zoomControl = new window.kakao.maps.ZoomControl();
    map.addControl(zoomControl, window.kakao.maps.ControlPosition.TOPRIGHT);

    console.log("✅ 카카오맵 초기화 완료");
  }, []);

  // ✅ 백엔드 API를 통한 Geocoding (통합 서비스)
  const geocodeLocation = async (location) => {
    if (!location || location === '미정') {
      return null;
    }

    // 캐시 확인
    if (geocodeCache.current.has(location)) {
      console.log(`💾 [캐시 적중] "${location}"`);
      return geocodeCache.current.get(location);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 [Geocoding 시작 - 백엔드 API 호출] "${location}"`);
    console.log(`${'='.repeat(60)}`);

    try {
      const response = await fetch('/api/v1/geocoding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.error(`❌ Geocoding 실패: "${location}" 좌표를 찾을 수 없습니다`);
          geocodeCache.current.set(location, null);
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        const coords = result.data;
        console.log(`✅ Geocoding 성공: "${location}"`);
        console.log(`   좌표: (${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)})`);
        console.log(`   방법: ${coords.method}`);
        if (coords.placeName) {
          console.log(`   장소명: ${coords.placeName}`);
        }
        if (coords.addressName) {
          console.log(`   주소: ${coords.addressName}`);
        }

        // 캐시에 저장
        geocodeCache.current.set(location, coords);
        return coords;
      }

      console.error(`❌ Geocoding 실패: "${location}"`);
      geocodeCache.current.set(location, null);
      return null;
    } catch (error) {
      console.error(`❌ Geocoding API 호출 오류:`, error);
      geocodeCache.current.set(location, null);
      return null;
    }
  };

  // ✅ 대한민국 전체 범위 검증 (향후 지역 필터 기능 추가 예정)
  const isValidKoreaArea = (lat, lng) => {
    // 한국 전체 범위: 제주도~북한 접경, 서해~동해
    return lat >= 33 && lat <= 38.5 && lng >= 124 && lng <= 132;
  };

  // ✅ 백엔드에서 데이터 가져오기
  useEffect(() => {
    async function fetchMarkets() {
      try {
        console.log('🔄 백엔드 API 호출 중...');
        const response = await fetch("/api/v1/flea-markets/visualization");

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("❌ API 호출 실패:", result.message);
          return;
        }

        const data = result.data;

        console.log('📦 백엔드에서 받은 데이터:', data.length, '개');
        if (data.length > 0) {
          console.log('📦 첫 번째 항목 원본:', JSON.stringify(data[0], null, 2));
          console.log('📦 위도 타입:', typeof data[0]?.위도, '값:', data[0]?.위도);
          console.log('📦 경도 타입:', typeof data[0]?.경도, '값:', data[0]?.경도);
        }

        // ✅ 좌표 검증 및 Geocoding 처리
        console.log('🔄 좌표 검증 및 Geocoding 시작...');
        const processedData = [];

        for (const item of data) {
          // 문자열을 숫자로 변환
          let lat = parseFloat(item.위도);
          let lng = parseFloat(item.경도);

          // 유효성 검증: 숫자 변환 성공 & 0이 아님 & 대한민국 범위
          const isValid =
            !isNaN(lat) && !isNaN(lng) &&  // 숫자 변환 성공
            lat !== 0 && lng !== 0 &&      // 0이 아님
            isValidKoreaArea(lat, lng);    // 대한민국 범위

          if (isValid) {
            // 이미 유효한 좌표가 있는 경우
            item.위도 = lat;
            item.경도 = lng;
            processedData.push(item);
            console.log(`✅ 유효 좌표: ${item.제목} (${lat}, ${lng})`);
          } else {
            // 좌표가 없거나 잘못된 경우 - Geocoding 시도
            console.log(`🔄 Geocoding 시도: ${item.제목} - 장소: "${item.장소}"`);

            if (item.장소 && item.장소 !== '미정' && item.장소.trim() !== '') {
              const geocoded = await geocodeLocation(item.장소);

              if (geocoded) {
                item.위도 = geocoded.lat;
                item.경도 = geocoded.lng;
                item._geocoded = true; // Geocoding으로 변환된 항목 표시
                item._변환정보 = geocoded.placeName || geocoded.addressName;

                // 향후 필터 기능을 위한 지역 정보 추출
                if (geocoded.addressName) {
                  // "서울특별시 강남구..." → "서울"
                  // "부산광역시 해운대구..." → "부산"
                  const region = geocoded.addressName.split(' ')[0]
                    .replace('특별시', '')
                    .replace('광역시', '')
                    .replace('시', '')
                    .replace('도', '');
                  item._지역 = region;
                }

                processedData.push(item);
                console.log(`✅ Geocoding 성공: ${item.제목} → (${geocoded.lat}, ${geocoded.lng}) [${item._지역 || '지역정보없음'}]`);
              } else {
                console.warn(`⚠️ Geocoding 실패: ${item.제목} - "${item.장소}"`);
              }
            } else {
              console.warn(`⚠️ 제외됨 (장소 정보 없음): ${item.제목}`);
            }
          }
        }

        const geocodedCount = processedData.filter(d => d._geocoded).length;
        const originalCoordCount = processedData.filter(d => !d._geocoded).length;
        const failedCount = data.length - processedData.length;
        const successRate = ((processedData.length / data.length) * 100).toFixed(1);

        console.log('');
        console.log('═══════════════════════════════════════');
        console.log('📊 좌표 처리 결과 통계');
        console.log('═══════════════════════════════════════');
        console.log(`✅ 총 처리 성공: ${processedData.length}개 / ${data.length}개 (${successRate}%)`);
        console.log(`📍 기존 좌표 사용: ${originalCoordCount}개`);
        console.log(`🔍 Geocoding 성공: ${geocodedCount}개`);
        console.log(`❌ 처리 실패: ${failedCount}개`);

        if (geocodedCount > 0) {
          const geocodingRate = ((geocodedCount / (geocodedCount + failedCount)) * 100).toFixed(1);
          console.log(`   └─ Geocoding 성공률: ${geocodingRate}%`);
        }

        console.log('═══════════════════════════════════════');
        console.log('');

        if (processedData.length > 0) {
          console.log('✅ 샘플 데이터:', processedData[0]);
        }

        if (failedCount > 0) {
          console.warn(`⚠️ ${failedCount}개 항목이 처리되지 않았습니다. 위 로그에서 실패 원인을 확인하세요.`);
        }

        setMarketData(processedData);
        setFilteredData(processedData);
      } catch (error) {
        console.error("❌ 데이터 불러오기 실패:", error);
        console.error("💡 백엔드 서버가 실행 중인지 확인하세요: http://localhost:3001");
      }
    }
    fetchMarkets();
  }, []);

  // ✅ 날짜 필터링 (자동 실행)
  useEffect(() => {
    console.log('=== 필터링 시작 ===');
    console.log('startDate:', startDate);
    console.log('endDate:', endDate);
    console.log('marketData 개수:', marketData.length);

    // 날짜가 변경될 때 선택된 마커와 클러스터 초기화
    setSelectedMarker(null);
    setSelectedClusterMarkers([]);

    if (!startDate && !endDate) {
      console.log('날짜 선택 안 됨 - 모든 데이터 표시');
      setFilteredData(marketData);
      return;
    }

    const filtered = marketData.filter((item) => {
      const dateList = item.날짜목록 || [];

      console.log('---');
      console.log('제목:', item.제목);
      console.log('날짜목록:', dateList);

      if (dateList.length === 0) {
        console.warn('⚠️ 날짜목록 비어있음:', item.제목, '원본:', item.날짜);
        return false;
      }

      // 선택한 기간 내에 플리마켓 날짜가 하나라도 있는지 확인
      const hasMatchingDate = dateList.some(date => {
        if (startDate && endDate) {
          return date >= startDate && date <= endDate;
        } else if (startDate) {
          return date >= startDate;
        } else if (endDate) {
          return date <= endDate;
        }
        return false;
      });

      if (hasMatchingDate) {
        console.log('✅ 포함됨:', item.제목);
      }

      return hasMatchingDate;
    });

    console.log('=== 필터링 결과 ===');
    console.log('필터링 후 개수:', filtered.length);
    console.log('필터링된 항목:', filtered.map(item => item.제목));

    setFilteredData(filtered);
  }, [startDate, endDate, marketData]);

  // ✅ 마커 생성 및 클러스터링
  useEffect(() => {
    if (!kakaoMapRef.current || !window.kakao) return;

    // 기존 마커 제거
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // 기존 클러스터러 제거
    if (clustererRef.current) {
      clustererRef.current.clear();
    }

    // 새로운 마커 생성
    const newMarkers = filteredData.map((item) => {
      const position = new window.kakao.maps.LatLng(item.위도, item.경도);
      const marker = new window.kakao.maps.Marker({
        position: position,
        map: null, // 클러스터러에 추가할 것이므로 일단 null
      });

      // 마커 클릭 이벤트
      window.kakao.maps.event.addListener(marker, 'click', () => {
        setSelectedMarker(item);
        setSelectedClusterMarkers([]);
      });

      // 마커에 데이터 저장
      marker.marketData = item;

      return marker;
    });

    markersRef.current = newMarkers;

    // 클러스터러 생성
    const clusterer = new window.kakao.maps.MarkerClusterer({
      map: kakaoMapRef.current,
      markers: newMarkers,
      gridSize: 60,
      averageCenter: true,
      minLevel: 5,
      disableClickZoom: true,
      calculator: [10, 30, 50], // 클러스터 크기 범위 정의
      styles: [
        {
          width: '30px',
          height: '30px',
          background: 'rgba(33, 150, 243, 0.8)',
          borderRadius: '15px',
          color: '#fff',
          textAlign: 'center',
          fontWeight: 'bold',
          lineHeight: '31px'
        },
        {
          width: '40px',
          height: '40px',
          background: 'rgba(33, 150, 243, 0.9)',
          borderRadius: '20px',
          color: '#fff',
          textAlign: 'center',
          fontWeight: 'bold',
          lineHeight: '41px'
        },
        {
          width: '50px',
          height: '50px',
          background: 'rgba(33, 150, 243, 1)',
          borderRadius: '25px',
          color: '#fff',
          textAlign: 'center',
          fontWeight: 'bold',
          lineHeight: '51px'
        }
      ]
    });

    clustererRef.current = clusterer;

    // 클러스터 클릭 이벤트
    window.kakao.maps.event.addListener(clusterer, 'clusterclick', (cluster) => {
      const markers = cluster.getMarkers();
      const clusterData = markers.map(marker => marker.marketData);
      setSelectedClusterMarkers(clusterData);
      setSelectedMarker(null);
    });

    console.log(`✅ ${newMarkers.length}개의 마커 생성 완료`);
  }, [filteredData]);

  // ✅ 날짜 클릭 핸들러
  const handleDateClick = (dateStr) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(dateStr);
      setEndDate("");
      setSelectingDate('end');
    } else if (startDate && !endDate) {
      if (dateStr < startDate) {
        setEndDate(startDate);
        setStartDate(dateStr);
      } else {
        setEndDate(dateStr);
      }
      setSelectingDate(null);

      setTimeout(() => {
        setShowDatePicker(false);
      }, 800);
    }
  };

  const resetFilter = () => {
    setStartDate("");
    setEndDate("");
    setSelectingDate(null);
    setFilteredData(marketData);
  };

  const formatDisplayDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="visual-container">
      <aside className="info-panel">
        <div className="info-panel-header">
          <h2>플리마켓 정보</h2>

          <div className="date-filter-container">
            <button
              className="date-filter-button"
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              <span className="calendar-icon">📅</span>
              <span className="date-filter-text">
                {startDate && endDate
                  ? `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`
                  : startDate
                  ? `${formatDisplayDate(startDate)} - 종료일`
                  : '날짜 선택'}
              </span>
            </button>

            {showDatePicker && (
              <div className="date-picker-dropdown">
                <div className="date-picker-header">
                  <h3>날짜 선택</h3>
                  <button
                    className="close-button"
                    onClick={() => setShowDatePicker(false)}
                  >
                    ✕
                  </button>
                </div>

                <div className="date-selection-guide">
                  {!startDate && <p>📅 시작일을 선택하세요</p>}
                  {startDate && !endDate && <p>📅 종료일을 선택하세요</p>}
                  {startDate && endDate && (
                    <p className="selection-complete">
                      ✓ {formatDisplayDate(startDate)} - {formatDisplayDate(endDate)}
                    </p>
                  )}
                </div>

                <Calendar
                  startDate={startDate}
                  endDate={endDate}
                  onDateClick={handleDateClick}
                />

                <div className="date-picker-footer">
                  <button
                    className="reset-button"
                    onClick={resetFilter}
                  >
                    초기화
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {(startDate || endDate) && (
          <div className="filter-result-info">
            <span>📍 {filteredData.length}개의 플리마켓</span>
            <button className="clear-filter" onClick={resetFilter}>✕</button>
          </div>
        )}

        {/* ✅ 날짜 선택 시 플리마켓이 없을 때 메시지 */}
        {(startDate || endDate) && filteredData.length === 0 && !selectedMarker && selectedClusterMarkers.length === 0 && (
          <div className="no-market-message">
            <p className="no-market-icon">📅</p>
            <p className="no-market-text">해당 날짜에 진행하는 플리마켓이 없습니다.</p>
            <button className="change-date-button" onClick={() => setShowDatePicker(true)}>
              날짜 변경하기
            </button>
          </div>
        )}

        {selectedMarker && (
          <div className="marker-detail-card">
            <h3>{selectedMarker.제목}</h3>
            <p>📍 장소: {selectedMarker.장소}</p>
            <p>📅 날짜: {selectedMarker.날짜목록 && selectedMarker.날짜목록.length > 0
                ? formatDateRange(selectedMarker.날짜목록)
                : selectedMarker.날짜}</p>
            <p>⏰ 시간: {formatTime(selectedMarker.시간)}</p>
          </div>
        )}

        {selectedClusterMarkers.length > 0 && (
          <div className="cluster-info">
            <h3>클러스터 내 마커 {selectedClusterMarkers.length}개</h3>
            {selectedClusterMarkers.map((item, idx) => (
              <div key={idx} className="cluster-item-card">
                <strong>{item.제목}</strong>
                <p>📍 {item.장소}</p>
                <p>📅 {item.날짜목록 && item.날짜목록.length > 0
                    ? formatDateRange(item.날짜목록)
                    : item.날짜}</p>
                <p>⏰ {formatTime(item.시간)}</p>
              </div>
            ))}
          </div>
        )}

        {/* ✅ 기본 플레이스홀더 */}
        {!selectedMarker && selectedClusterMarkers.length === 0 && !(startDate || endDate) && (
          <p className="placeholder-text">
            마커 또는 클러스터를 클릭하면 정보가 여기에 표시됩니다.
          </p>
        )}
      </aside>

      {/* 우측 지도 */}
      <div className="map-wrapper">
        <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
      </div>
    </div>
  );
}
