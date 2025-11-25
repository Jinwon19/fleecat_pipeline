/**
 * Geocoding 일괄 업데이트 스크립트
 * Supabase markets 테이블의 모든 항목에 대해 좌표를 자동으로 채웁니다.
 *
 * 실행 방법:
 * node scripts/updateGeocoords.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const geocodingService = require('../src/services/geocoding.service');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경 변수 확인 필요: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateGeocoordinates() {
  console.log('='.repeat(80));
  console.log('🗺️  Geocoding 일괄 업데이트 시작');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. 모든 markets 데이터 조회
    console.log('📝 Step 1: markets 테이블 조회...');
    const { data: markets, error: fetchError } = await supabase
      .from('markets')
      .select('id, market_name, place, lat, lng');

    if (fetchError) {
      throw new Error(`DB 조회 실패: ${fetchError.message}`);
    }

    console.log(`📊 총 ${markets.length}개 항목 조회 완료`);
    console.log('');

    // 2. 좌표 없는 항목 필터링
    const needsGeocoding = markets.filter(
      (m) =>
        !m.lat ||
        !m.lng ||
        m.lat === 0 ||
        m.lng === 0 ||
        m.lat === null ||
        m.lng === null
    );

    console.log(`🎯 좌표 없음: ${needsGeocoding.length}개`);
    console.log(`✅ 이미 좌표 있음: ${markets.length - needsGeocoding.length}개`);
    console.log('');

    if (needsGeocoding.length === 0) {
      console.log('✅ 모든 항목에 이미 좌표가 있습니다!');
      return;
    }

    // 3. Geocoding 수행
    console.log('='.repeat(80));
    console.log('📝 Step 2: Geocoding 시작...');
    console.log('='.repeat(80));
    console.log('');

    let successCount = 0;
    let failCount = 0;
    const failures = [];

    for (let i = 0; i < needsGeocoding.length; i++) {
      const market = needsGeocoding[i];
      console.log(`[${i + 1}/${needsGeocoding.length}] ${market.market_name.substring(0, 50)}`);
      console.log(`  장소: ${market.place}`);

      if (!market.place || market.place === '미정') {
        console.log(`  ⚠️  장소 정보 없음 - 스킵`);
        failCount++;
        failures.push({
          id: market.id,
          market_name: market.market_name,
          place: market.place,
          reason: '장소 정보 없음',
        });
        console.log('');
        continue;
      }

      // Geocoding 수행 (market_name도 함께 전달하여 건물명 추출에 활용)
      try {
        const coords = await geocodingService.geocode(market.place, market.market_name);

        if (coords) {
          // Supabase 업데이트
          const { error: updateError } = await supabase
            .from('markets')
            .update({
              lat: coords.lat,
              lng: coords.lng,
            })
            .eq('id', market.id);

          if (updateError) {
            console.log(`  ❌ DB 업데이트 실패: ${updateError.message}`);
            failCount++;
            failures.push({
              id: market.id,
              market_name: market.market_name,
              place: market.place,
              reason: `DB 업데이트 실패: ${updateError.message}`,
            });
          } else {
            console.log(`  ✅ 좌표: (${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)})`);
            console.log(`  📍 방법: ${coords.method}`);
            successCount++;
          }
        } else {
          console.log(`  ❌ Geocoding 실패`);
          failCount++;
          failures.push({
            id: market.id,
            market_name: market.market_name,
            place: market.place,
            reason: 'Geocoding 실패 (모든 검색 방법 실패)',
          });
        }
      } catch (error) {
        console.log(`  ❌ 처리 오류: ${error.message}`);
        failCount++;
        failures.push({
          id: market.id,
          market_name: market.market_name,
          place: market.place,
          reason: `처리 오류: ${error.message}`,
        });
      }

      console.log('');

      // API 속도 제한 방지 (100ms 딜레이)
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // 4. 결과 요약
    console.log('='.repeat(80));
    console.log('📊 Geocoding 일괄 업데이트 완료');
    console.log('='.repeat(80));
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${failCount}개`);

    if (failCount > 0) {
      const successRate = ((successCount / (successCount + failCount)) * 100).toFixed(1);
      console.log(`   성공률: ${successRate}%`);
    }

    console.log('='.repeat(80));
    console.log('');

    // 5. 실패 케이스 저장
    if (failures.length > 0) {
      const fs = require('fs');
      const logFile = 'geocoding_failures.json';
      fs.writeFileSync(logFile, JSON.stringify(failures, null, 2), 'utf-8');
      console.log(`📋 실패 케이스가 '${logFile}'에 저장되었습니다.`);
      console.log(`   파일을 확인하여 수동으로 수정하거나 프롬프트를 개선하세요.`);
      console.log('');
    }

    console.log('✅ 모든 작업 완료!');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
updateGeocoordinates()
  .then(() => {
    console.log('\n✅ 스크립트 정상 종료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
