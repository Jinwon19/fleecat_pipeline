import React, { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./Visual.css";

// ✅ 기본 아이콘 설정
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// ✅ 클러스터 아이콘을 생성하는 함수
const createClusterCustomIcon = (cluster) => {
  return L.divIcon({
    html: `<div class="custom-cluster-icon"><span>${cluster.getChildCount()}</span></div>`,
    className: "marker-cluster-custom",
    iconSize: L.point(40, 40, true),
  });
};
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

// 커스텀 줌 버튼 컴포넌트
function ZoomControl() {
  const map = useMap();
  return (
    <div className="zoom-control">
      <button className="zoom-button zoom-in" onClick={() => map.zoomIn()}>+</button>
      <button className="zoom-button zoom-out" onClick={() => map.zoomOut()}>−</button>
    </div>
  );
}

// 메인 컴포넌트
export default function Visual() {
  const [marketData, setMarketData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [selectedClusterMarkers, setSelectedClusterMarkers] = useState([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectingDate, setSelectingDate] = useState(null); // ✅ 'start' 또는 'end'

  useEffect(() => {
    async function fetchMarkets() {
      try {
        // ✅ 백엔드 API 호출
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
        console.log('📦 첫 번째 항목:', data[0]);

        // ✅ 유효한 좌표를 가진 항목만 필터링
        const validData = data.filter(item => {
          const isValid = !isNaN(item.위도) && !isNaN(item.경도) &&
                         item.위도 !== 0 && item.경도 !== 0;
          if (!isValid) {
            console.error(`❌ 제외됨 (잘못된 좌표): ${item.제목}`, { 위도: item.위도, 경도: item.경도 });
          }
          return isValid;
        });

        console.log('✅ 유효한 좌표:', validData.length, '개');
        console.log('샘플 데이터:', validData[0]);

        setMarketData(validData);
        setFilteredData(validData);
      } catch (error) {
        console.error("❌ 데이터 불러오기 실패:", error);
        console.error("💡 백엔드 서버가 실행 중인지 확인하세요: http://localhost:3001");
      }
    }
    fetchMarkets();
  }, []);

  // ✅ 날짜 필터링 (자동 실행) - 날짜목록 배열 사용
  useEffect(() => {
    console.log('=== 필터링 시작 ===');
    console.log('startDate:', startDate);
    console.log('endDate:', endDate);
    console.log('marketData 개수:', marketData.length);

    // ✅ 날짜가 변경될 때 선택된 마커와 클러스터 초기화
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

  // ✅ 날짜 클릭 핸들러
  const handleDateClick = (dateStr) => {
    if (!startDate || (startDate && endDate)) {
      // 첫 번째 날짜 선택 또는 재선택
      setStartDate(dateStr);
      setEndDate("");
      setSelectingDate('end');
    } else if (startDate && !endDate) {
      // 두 번째 날짜 선택
      if (dateStr < startDate) {
        // 시작일보다 이전 날짜를 선택한 경우 순서 바꾸기
        setEndDate(startDate);
        setStartDate(dateStr);
      } else {
        setEndDate(dateStr);
      }
      setSelectingDate(null);

      // 2초 후 자동으로 달력 닫기
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

  // ✅ 마커 컴포넌트를 useMemo로 최적화 - filteredData가 변경될 때만 재생성
  const markers = useMemo(() => {
    return filteredData.map((item, idx) => {
      const uniqueKey = `marker-${item.제목}-${item.장소}-${item.위도}-${item.경도}-${idx}`;
      return (
        <Marker
          key={uniqueKey}
          position={[item.위도, item.경도]}
          marketInfo={item}
          eventHandlers={{
            click: (e) => {
              e.originalEvent.preventDefault();
              e.originalEvent.stopPropagation();
              setSelectedMarker(item);
              setSelectedClusterMarkers([]);
            },
          }}
        />
      );
    });
  }, [filteredData]);

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
                ? selectedMarker.날짜목록.join(', ')
                : selectedMarker.날짜}</p>
            <p>⏰ 시간: {selectedMarker.시간}</p>
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
                    ? item.날짜목록.join(', ')
                    : item.날짜}</p>
                <p>⏰ {item.시간}</p>
              </div>
            ))}
          </div>
        )}

        {/* ✅ 기본 플레이스홀더 - 날짜 미선택 & 마커/클러스터 미선택 시에만 표시 */}
        {!selectedMarker && selectedClusterMarkers.length === 0 && !(startDate || endDate) && (
          <p className="placeholder-text">
            마커 또는 클러스터를 클릭하면 정보가 여기에 표시됩니다.
          </p>
        )}
      </aside>

      {/* 우측 지도 */}
      <div className="map-wrapper">
        <MapContainer
          center={[35.179791, 129.074753]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
          doubleClickZoom={false}
          zoomControl={false}
          attributionControl={false}
          fadeAnimation={true}
          zoomAnimation={true}
          markerZoomAnimation={true}
          zoomSnap={0.25}
          zoomDelta={0.5}
          wheelPxPerZoomLevel={60}
          preferCanvas={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            updateWhenIdle={false}
            updateWhenZooming={true}
            keepBuffer={2}
          />

          <MarkerClusterGroup
            iconCreateFunction={createClusterCustomIcon}
            zoomToBoundsOnClick={false}
            spiderfyOnMaxZoom={false}
            showCoverageOnHover={false}
            animate={true}
            animateAddingMarkers={true}
            removeOutsideVisibleBounds={true}
            eventHandlers={{
              clusterclick: (clusterEvent) => {
                clusterEvent.originalEvent.preventDefault();
                clusterEvent.originalEvent.stopPropagation();

                const clusterMarkers = clusterEvent.layer.getAllChildMarkers();
                const clusterData = clusterMarkers.map(
                  (marker) => marker.options.marketInfo
                );

                setSelectedClusterMarkers(clusterData);
                setSelectedMarker(null);
              },
            }}
          >
            {markers}
          </MarkerClusterGroup>

          <ZoomControl />
        </MapContainer>
      </div>
    </div>
  );
}
