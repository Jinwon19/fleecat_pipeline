/**
 * Supabase Client
 * 백엔드 서버용 - SERVICE_ROLE_KEY 사용
 */

const { createClient } = require('@supabase/supabase-js');

// 환경 변수에서 가져오기
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_KEY가 .env에 없습니다!');
}

// Supabase 클라이언트 생성 (SERVICE_ROLE_KEY 사용)
// 백엔드 서버는 RLS를 우회하고 모든 데이터에 접근할 수 있습니다
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('✅ Supabase 클라이언트 초기화 완료 (SERVICE_ROLE_KEY)');

module.exports = { supabase };
