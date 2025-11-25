/**
 * FleaMarket Service
 * 비즈니스 로직 처리
 */

const fleaMarketRepository = require('../repositories/fleaMarket.repository');

class FleaMarketService {
  /**
   * 모든 플리마켓 조회
   * @param {Object} filters - 필터 옵션 { startDate, endDate }
   */
  async getFleaMarkets(filters = {}) {
    const { startDate, endDate } = filters;

    // 날짜 필터가 있으면 날짜 범위로 조회
    if (startDate || endDate) {
      return await fleaMarketRepository.findByDateRange(startDate, endDate);
    }

    // 필터 없으면 전체 조회
    return await fleaMarketRepository.findAll();
  }

  /**
   * 위치 정보가 있는 플리마켓만 조회
   */
  async getFleaMarketsWithLocation() {
    return await fleaMarketRepository.findWithLocation();
  }

  /**
   * 특정 플리마켓 상세 조회
   */
  async getFleaMarketById(id) {
    const market = await fleaMarketRepository.findById(id);

    if (!market) {
      const error = new Error('플리마켓을 찾을 수 없습니다');
      error.statusCode = 404;
      throw error;
    }

    return market;
  }

  /**
   * 다가오는 플리마켓 조회
   */
  async getUpcomingFleaMarkets(limit) {
    return await fleaMarketRepository.findUpcoming(limit);
  }

  /**
   * 프론트엔드 지도 시각화용 데이터 변환
   * Excel 형식과 동일한 구조로 변환
   */
  transformForVisualization(markets) {
    return markets.map(market => {
      // 모든 세션의 날짜를 배열로 생성
      const dateList = [];

      if (market.sessions && market.sessions.length > 0) {
        market.sessions.forEach(session => {
          if (session.start_date && session.end_date) {
            // 시작일부터 종료일까지 날짜 범위 생성
            const dates = this._generateDateRange(
              session.start_date,
              session.end_date
            );
            dateList.push(...dates);
          } else if (session.start_date) {
            // 시작일만 있는 경우
            dateList.push(session.start_date);
          }
        });
      }

      // 중복 제거 및 정렬
      const uniqueDates = [...new Set(dateList)].sort();

      // 날짜 표시용 문자열 생성
      let dateDisplayString = '';
      if (uniqueDates.length === 0) {
        dateDisplayString = '날짜 미정';
      } else if (uniqueDates.length === 1) {
        dateDisplayString = uniqueDates[0];
      } else {
        dateDisplayString = `${uniqueDates[0]} ~ ${uniqueDates[uniqueDates.length - 1]}`;
      }

      return {
        제목: market.market_name || market.title,
        장소: market.place,
        위도: parseFloat(market.lat) || 0,
        경도: parseFloat(market.lng) || 0,
        날짜: dateDisplayString,
        날짜목록: uniqueDates,
        시간: this._formatSessionTimes(market.sessions),
        URL: market.url,
        이미지: market.image_url,
      };
    });
  }

  /**
   * 시작일부터 종료일까지 날짜 배열 생성
   */
  _generateDateRange(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate);
    const last = new Date(endDate);

    while (current <= last) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  /**
   * 세션 시간 포맷팅
   */
  _formatSessionTimes(sessions) {
    if (!sessions || sessions.length === 0) return '시간 미정';

    const times = sessions
      .filter(s => s.start_time || s.end_time)
      .map(s => {
        if (s.start_time && s.end_time) {
          return `${s.start_time} ~ ${s.end_time}`;
        } else if (s.start_time) {
          return `${s.start_time}부터`;
        } else if (s.end_time) {
          return `${s.end_time}까지`;
        }
        return '';
      })
      .filter(t => t);

    return times.length > 0 ? times[0] : '시간 미정';
  }
}

module.exports = new FleaMarketService();
