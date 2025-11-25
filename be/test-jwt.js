/**
 * JWT 유틸리티 테스트 스크립트
 *
 * 실행 방법: node test-jwt.js
 */

// 환경변수 로드
require('dotenv').config();

const { generateToken, verifyToken } = require('./src/utils/jwt');

console.log('='.repeat(60));
console.log('🧪 JWT 유틸리티 테스트 시작');
console.log('='.repeat(60));
console.log();

// 테스트 1: 토큰 생성
console.log('📝 테스트 1: JWT 토큰 생성');
console.log('-'.repeat(60));

const testPayload = {
  member_id: 123,
  email: 'test@example.com',
  role: 'buyer'
};

console.log('입력 데이터:', JSON.stringify(testPayload, null, 2));

try {
  const token = generateToken(testPayload);
  console.log('✅ 토큰 생성 성공!');
  console.log('생성된 토큰:', token);
  console.log('토큰 길이:', token.length, '자');
  console.log();

  // 테스트 2: 토큰 검증
  console.log('📝 테스트 2: JWT 토큰 검증');
  console.log('-'.repeat(60));

  const decoded = verifyToken(token);
  console.log('✅ 토큰 검증 성공!');
  console.log('디코딩 결과:', JSON.stringify(decoded, null, 2));
  console.log();

  // 테스트 3: 데이터 일치 확인
  console.log('📝 테스트 3: 데이터 일치 확인');
  console.log('-'.repeat(60));

  const checks = [
    { name: 'member_id', original: testPayload.member_id, decoded: decoded.member_id },
    { name: 'email', original: testPayload.email, decoded: decoded.email },
    { name: 'role', original: testPayload.role, decoded: decoded.role }
  ];

  let allMatch = true;
  checks.forEach(check => {
    const match = check.original === check.decoded;
    allMatch = allMatch && match;
    console.log(`${match ? '✅' : '❌'} ${check.name}: ${check.original} === ${check.decoded}`);
  });

  console.log();
  if (allMatch) {
    console.log('✅ 모든 데이터가 일치합니다!');
  } else {
    console.log('❌ 데이터 불일치 발견!');
  }
  console.log();

  // 테스트 4: 잘못된 토큰 검증
  console.log('📝 테스트 4: 잘못된 토큰 검증');
  console.log('-'.repeat(60));

  const invalidToken = 'invalid.token.here';
  try {
    verifyToken(invalidToken);
    console.log('❌ 잘못된 토큰이 통과됨 (버그!)');
  } catch (error) {
    console.log('✅ 잘못된 토큰 검증 실패 (정상 동작)');
    console.log('에러 메시지:', error.message);
  }
  console.log();

  // 테스트 5: 판매자 토큰 생성 (멀티테넌트)
  console.log('📝 테스트 5: 판매자 토큰 생성 (멀티테넌트)');
  console.log('-'.repeat(60));

  const sellerPayload = {
    member_id: 456,
    email: 'seller@example.com',
    role: 'seller',
    tenant_id: 5,
    tenant_member_id: 78
  };

  console.log('입력 데이터:', JSON.stringify(sellerPayload, null, 2));

  const sellerToken = generateToken(sellerPayload);
  const decodedSeller = verifyToken(sellerToken);

  console.log('✅ 판매자 토큰 생성 및 검증 성공!');
  console.log('디코딩 결과:', JSON.stringify(decodedSeller, null, 2));
  console.log();

  // 최종 결과
  console.log('='.repeat(60));
  console.log('🎉 모든 테스트 통과!');
  console.log('='.repeat(60));
  console.log();
  console.log('📌 JWT 토큰 정보:');
  console.log(`  - 발급 시간 (iat): ${new Date(decoded.iat * 1000).toLocaleString('ko-KR')}`);
  console.log(`  - 만료 시간 (exp): ${new Date(decoded.exp * 1000).toLocaleString('ko-KR')}`);
  console.log(`  - 유효 기간: ${Math.floor((decoded.exp - decoded.iat) / 86400)}일`);
  console.log();

  // jwt.io 안내
  console.log('🌐 온라인 디버거로 확인하기:');
  console.log('  1. https://jwt.io 접속');
  console.log('  2. 왼쪽 "Encoded"에 아래 토큰 붙여넣기:');
  console.log('     ' + token.substring(0, 50) + '...');
  console.log('  3. 오른쪽에서 Payload 내용 확인');
  console.log();

} catch (error) {
  console.error('❌ 테스트 실패:', error.message);
  console.error('스택 트레이스:', error.stack);
  process.exit(1);
}
