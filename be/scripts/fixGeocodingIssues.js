/**
 * Geocoding 문제 케이스 수동 수정 스크립트
 *
 * 수정 내용:
 * 1. ID 46 (북부프리마켓): 노원구청 좌표로 수정
 * 2. ID 55 (대추초롱조원복길): 좌표 NULL 유지 (주소 정보 없음)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경 변수 확인 필요: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixGeocodingIssues() {
  console.log('='.repeat(80));
  console.log('🔧 Geocoding 문제 케이스 수동 수정');
  console.log('='.repeat(80));
  console.log('');

  try {
    // ID 46: 북부프리마켓 - 노원구청 좌표로 수정
    console.log('[1/2] 북부프리마켓 (ID 46) 좌표 수정...');
    console.log('   기존: 경북 경산시 (35.839038, 128.753220) ❌');
    console.log('   수정: 서울 노원구청 (37.6543, 127.0565) ✅');

    const { error: error1 } = await supabase
      .from('markets')
      .update({
        lat: 37.6543,
        lng: 127.0565,
      })
      .eq('id', 46);

    if (error1) {
      console.error(`   ❌ 업데이트 실패: ${error1.message}`);
    } else {
      console.log('   ✅ 업데이트 성공!');
    }
    console.log('');

    // ID 55: 대추초롱조원복길 - 좌표 NULL로 설정 (주소 정보 없음)
    console.log('[2/2] 대추초롱조원복길 (ID 55) 좌표 NULL 설정...');
    console.log('   사유: OpenAI 주소 추출 실패 ("정확한 장소 또는 주소")');
    console.log('   조치: 좌표를 NULL로 유지하여 지도에 표시하지 않음');

    const { error: error2 } = await supabase
      .from('markets')
      .update({
        lat: null,
        lng: null,
      })
      .eq('id', 55);

    if (error2) {
      console.error(`   ❌ 업데이트 실패: ${error2.message}`);
    } else {
      console.log('   ✅ 업데이트 성공!');
    }
    console.log('');

    // 최종 결과 확인
    console.log('='.repeat(80));
    console.log('📊 최종 결과 확인');
    console.log('='.repeat(80));

    const { data: allMarkets, error: fetchError } = await supabase
      .from('markets')
      .select('id, lat, lng')
      .is('lat', null)
      .or('lng.is.null,lat.eq.0,lng.eq.0');

    if (fetchError) {
      console.error(`❌ 조회 실패: ${fetchError.message}`);
    } else {
      console.log(`\n📍 좌표 없는 항목: ${allMarkets.length}개`);
      if (allMarkets.length > 0) {
        console.log('   IDs:', allMarkets.map(m => m.id).join(', '));
      }
    }

    const { data: totalMarkets, error: totalError } = await supabase
      .from('markets')
      .select('id', { count: 'exact' });

    if (!totalError) {
      const successRate = (((totalMarkets.length - allMarkets.length) / totalMarkets.length) * 100).toFixed(1);
      console.log(`\n✅ 전체 성공률: ${successRate}% (${totalMarkets.length - allMarkets.length}/${totalMarkets.length})`);
    }

    console.log('\n✅ 수정 완료!');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
fixGeocodingIssues()
  .then(() => {
    console.log('\n✅ 스크립트 정상 종료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
