/**
 * FleaMarket Data Migration Script
 * JSON 파일 → Supabase DB (markets + sessions 테이블)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('🚀 FleaMarket 데이터 마이그레이션 시작...\n');
console.log('📍 Supabase URL:', SUPABASE_URL);
console.log('🔑 Service Key:', SUPABASE_SERVICE_KEY ? '✅ 설정됨' : '❌ 없음');
console.log('');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Step 1: markets 테이블 생성 (존재하지 않는 경우)
 */
async function createMarketsTable() {
  console.log('📊 Step 1: markets 테이블 확인/생성 중...');

  const { error } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS markets (
        id BIGSERIAL PRIMARY KEY,
        market_name VARCHAR(200) NOT NULL,
        place VARCHAR(300),
        url TEXT,
        title TEXT,
        image_url TEXT,
        lat DECIMAL(10, 7),
        lng DECIMAL(10, 7),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 인덱스 생성
      CREATE INDEX IF NOT EXISTS idx_markets_name ON markets(market_name);
      CREATE INDEX IF NOT EXISTS idx_markets_location ON markets(lat, lng);
    `
  });

  if (error) {
    console.log('⚠️  RPC 함수를 사용할 수 없습니다. 수동으로 테이블을 생성해야 합니다.');
    console.log('   Supabase SQL Editor에서 다음 SQL을 실행하세요:\n');
    console.log(`
CREATE TABLE IF NOT EXISTS markets (
  id BIGSERIAL PRIMARY KEY,
  market_name VARCHAR(200) NOT NULL,
  place VARCHAR(300),
  url TEXT,
  title TEXT,
  image_url TEXT,
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_markets_name ON markets(market_name);
CREATE INDEX IF NOT EXISTS idx_markets_location ON markets(lat, lng);

CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  market_id BIGINT REFERENCES markets(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_market_id ON sessions(market_id);
CREATE INDEX IF NOT EXISTS idx_sessions_dates ON sessions(start_date, end_date);
    `);
    return false;
  }

  console.log('✅ markets 테이블 준비 완료\n');
  return true;
}

/**
 * Step 2: sessions 테이블 생성
 */
async function createSessionsTable() {
  console.log('📅 Step 2: sessions 테이블 확인/생성 중...');

  const { error } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS sessions (
        id BIGSERIAL PRIMARY KEY,
        market_id BIGINT REFERENCES markets(id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 인덱스 생성
      CREATE INDEX IF NOT EXISTS idx_sessions_market_id ON sessions(market_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_dates ON sessions(start_date, end_date);
    `
  });

  if (error) {
    console.log('⚠️  위의 SQL을 Supabase SQL Editor에서 실행하세요.');
    return false;
  }

  console.log('✅ sessions 테이블 준비 완료\n');
  return true;
}

/**
 * Step 3: JSON 데이터 읽기
 */
function loadJsonData() {
  console.log('📖 Step 3: JSON 파일 읽기 중...');

  const jsonPath = path.join(__dirname, '../../flee/fleamarket_structured.json');

  if (!fs.existsSync(jsonPath)) {
    console.error('❌ JSON 파일을 찾을 수 없습니다:', jsonPath);
    return null;
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(rawData);

  console.log(`✅ ${data.length}개의 플리마켓 데이터 로드 완료\n`);
  return data;
}

/**
 * Step 4: 데이터 업로드 (markets + sessions)
 */
async function uploadData(jsonData) {
  console.log('📤 Step 4: Supabase에 데이터 업로드 중...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const item of jsonData) {
    try {
      // 1. market 레코드 삽입
      const { data: market, error: marketError } = await supabase
        .from('markets')
        .insert({
          market_name: item.market_name,
          place: item.place,
          url: item.url,
          title: item._source?.title || null,
          image_url: item._source?.image_url || null,
          lat: null, // 위도 - 나중에 geocoding 필요
          lng: null, // 경도 - 나중에 geocoding 필요
        })
        .select()
        .single();

      if (marketError) {
        console.error(`❌ [${item.market_name}] 마켓 삽입 실패:`, marketError.message);
        errorCount++;
        continue;
      }

      const marketId = market.id;

      // 2. sessions 레코드 삽입 (여러 세션이 있을 수 있음)
      if (item.sessions && item.sessions.length > 0) {
        const sessionsToInsert = item.sessions.map(session => ({
          market_id: marketId,
          start_date: session.start_date,
          end_date: session.end_date,
          start_time: session.start_time || null,
          end_time: session.end_time || null,
          notes: session.notes || null,
        }));

        const { error: sessionsError } = await supabase
          .from('sessions')
          .insert(sessionsToInsert);

        if (sessionsError) {
          console.error(`❌ [${item.market_name}] 세션 삽입 실패:`, sessionsError.message);
        }
      }

      successCount++;
      console.log(`✅ [${successCount}/${jsonData.length}] ${item.market_name}`);

    } catch (error) {
      console.error(`❌ [${item.market_name}] 예외 발생:`, error.message);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${errorCount}개`);
  console.log('='.repeat(60) + '\n');

  return { successCount, errorCount };
}

/**
 * Step 5: 업로드 결과 확인
 */
async function verifyUpload() {
  console.log('🔍 Step 5: 업로드 결과 확인 중...\n');

  // markets 테이블 확인
  const { data: markets, count: marketsCount, error: marketsError } = await supabase
    .from('markets')
    .select('*', { count: 'exact', head: true });

  if (marketsError) {
    console.error('❌ markets 테이블 확인 실패:', marketsError.message);
  } else {
    console.log(`✅ markets 테이블: ${marketsCount}개 행사`);
  }

  // sessions 테이블 확인
  const { data: sessions, count: sessionsCount, error: sessionsError } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true });

  if (sessionsError) {
    console.error('❌ sessions 테이블 확인 실패:', sessionsError.message);
  } else {
    console.log(`✅ sessions 테이블: ${sessionsCount}개 세션`);
  }

  console.log('');
}

/**
 * 메인 실행
 */
async function main() {
  try {
    // Step 0: 기존 데이터 확인
    console.log('🔍 Step 0: 기존 데이터 확인 중...\n');
    const { count: existingMarkets } = await supabase
      .from('markets')
      .select('*', { count: 'exact', head: true });

    if (existingMarkets && existingMarkets > 0) {
      console.log(`⚠️  경고: markets 테이블에 이미 ${existingMarkets}개의 데이터가 있습니다.`);
      console.log('   기존 데이터를 모두 삭제하려면 Supabase SQL Editor에서 다음을 실행하세요:');
      console.log('   TRUNCATE TABLE sessions, markets CASCADE;\n');

      // 계속 진행할지 물어봄 (하지만 스크립트로 실행 시 자동 진행)
      console.log('   ⏭️  기존 데이터 유지하고 새 데이터 추가합니다...\n');
    }

    // Step 1-2: 테이블 생성
    const tablesCreated = await createMarketsTable() && await createSessionsTable();

    if (!tablesCreated) {
      console.log('\n⚠️  테이블을 수동으로 생성한 후 다시 실행하세요.');
      console.log('   또는 Supabase에서 RLS(Row Level Security)를 비활성화하세요.\n');
    }

    // Step 3: JSON 데이터 로드
    const jsonData = loadJsonData();
    if (!jsonData) {
      process.exit(1);
    }

    // Step 4: 데이터 업로드
    const { successCount, errorCount } = await uploadData(jsonData);

    // Step 5: 결과 확인
    await verifyUpload();

    // 요약
    console.log('🎉 마이그레이션 완료!\n');
    console.log('⚠️  주의사항:');
    console.log('   1. 위도/경도 데이터가 없습니다. 지도 시각화를 위해 geocoding이 필요합니다.');
    console.log('   2. Supabase 대시보드에서 데이터를 확인하세요.');
    console.log('   3. 백엔드 API를 실행하여 /api/v1/flea-markets 엔드포인트를 테스트하세요.\n');

  } catch (error) {
    console.error('\n❌ 마이그레이션 실패:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// 실행
main();
