/**
 * Supabase 데이터 확인 스크립트
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

console.log('🔍 Supabase 연결 확인...');
console.log('URL:', SUPABASE_URL);
console.log('Key:', SUPABASE_ANON_KEY ? '✅ 있음' : '❌ 없음');
console.log('');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkDatabase() {
  try {
    // markets 테이블 확인
    console.log('📊 markets 테이블 확인 중...');
    const { data: markets, error: marketsError, count: marketsCount } = await supabase
      .from('markets')
      .select('*', { count: 'exact', head: false })
      .limit(5);

    if (marketsError) {
      console.log('❌ markets 테이블 오류:', marketsError.message);
    } else {
      console.log(`✅ markets 테이블: ${marketsCount}개 행사 발견`);
      if (markets && markets.length > 0) {
        console.log('   첫 번째 행사:', markets[0].market_name);
      }
    }
    console.log('');

    // sessions 테이블 확인
    console.log('📅 sessions 테이블 확인 중...');
    const { data: sessions, error: sessionsError, count: sessionsCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: false })
      .limit(5);

    if (sessionsError) {
      console.log('❌ sessions 테이블 오류:', sessionsError.message);
    } else {
      console.log(`✅ sessions 테이블: ${sessionsCount}개 세션 발견`);
      if (sessions && sessions.length > 0) {
        console.log('   첫 번째 세션:', sessions[0].start_date, '~', sessions[0].end_date);
      }
    }

    console.log('');
    console.log('='.repeat(60));
    if (!marketsError && !sessionsError) {
      console.log('✅ Supabase DB 연결 성공!');
      console.log(`📊 총 ${marketsCount}개 플리마켓, ${sessionsCount}개 세션`);
    } else {
      console.log('⚠️ 일부 테이블에 문제가 있습니다.');
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  }
}

checkDatabase();
