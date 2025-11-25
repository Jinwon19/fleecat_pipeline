require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('🔍 Supabase 연결 테스트');
console.log('URL:', SUPABASE_URL);
console.log('Service Key:', SUPABASE_SERVICE_KEY ? `${SUPABASE_SERVICE_KEY.substring(0, 20)}...` : '❌ 없음');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function test() {
  try {
    console.log('\n📊 markets 테이블 조회 시도...');
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ 에러:', error);
    } else {
      console.log('✅ 성공! 데이터 개수:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('첫 번째 데이터:', data[0]);
      }
    }
  } catch (err) {
    console.error('❌ 예외:', err.message);
  }
}

test();
