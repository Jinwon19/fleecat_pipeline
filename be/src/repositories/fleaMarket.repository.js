/**
 * FleaMarket Repository
 * Supabase의 markets, sessions 테이블과 연동
 */

const { supabase } = require('../lib/supabase');

class FleaMarketRepository {
  /**
   * 모든 플리마켓 행사 조회 (세션 포함)
   */
  async findAll() {
    try {
      const { data, error } = await supabase
        .from('markets')
        .select(`
          *,
          sessions (*)
        `)
        .order('id', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ findAll 오류:', error);
      throw error;
    }
  }

  /**
   * 날짜 범위로 플리마켓 필터링
   * @param {string} startDate - 시작일 (YYYY-MM-DD)
   * @param {string} endDate - 종료일 (YYYY-MM-DD)
   */
  async findByDateRange(startDate, endDate) {
    try {
      let query = supabase
        .from('markets')
        .select(`
          *,
          sessions!inner (*)
        `);

      // 날짜 필터링
      if (startDate && endDate) {
        // 세션의 종료일이 검색 시작일 이후 && 세션의 시작일이 검색 종료일 이전
        query = query
          .gte('sessions.end_date', startDate)
          .lte('sessions.start_date', endDate);
      } else if (startDate) {
        // 시작일만 있는 경우: 세션 종료일이 검색일 이후
        query = query.gte('sessions.end_date', startDate);
      } else if (endDate) {
        // 종료일만 있는 경우: 세션 시작일이 검색일 이전
        query = query.lte('sessions.start_date', endDate);
      }

      const { data, error } = await query.order('id', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ findByDateRange 오류:', error);
      throw error;
    }
  }

  /**
   * 위치 정보가 있는 플리마켓만 조회
   */
  async findWithLocation() {
    try {
      const { data, error } = await supabase
        .from('markets')
        .select(`
          *,
          sessions (*)
        `)
        .neq('place', '미정')
        .neq('place', '')
        .not('place', 'is', null)
        .order('id', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ findWithLocation 오류:', error);
      throw error;
    }
  }

  /**
   * 특정 플리마켓 조회 (ID)
   */
  async findById(id) {
    try {
      const { data, error } = await supabase
        .from('markets')
        .select(`
          *,
          sessions (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ findById 오류:', error);
      throw error;
    }
  }

  /**
   * 다가오는 플리마켓 조회
   * @param {number} limit - 조회 개수 제한
   */
  async findUpcoming(limit = 50) {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      const { data, error } = await supabase
        .from('markets')
        .select(`
          *,
          sessions!inner (*)
        `)
        .gte('sessions.start_date', today)
        .order('sessions.start_date', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ findUpcoming 오류:', error);
      throw error;
    }
  }
}

module.exports = new FleaMarketRepository();
