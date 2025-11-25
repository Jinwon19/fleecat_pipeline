// Jest 테스트 환경 설정
require('dotenv').config({ path: '.env.test' });

// 테스트 시작 전 실행
beforeAll(() => {
  console.log('\n🧪 Starting test suite...\n');
});

// 각 테스트 파일 완료 후 실행
afterAll(() => {
  console.log('\n✅ Test suite completed\n');
});

// 전역 Mock 설정 (필요시)
global.console = {
  ...console,
  // 테스트 중 불필요한 로그 숨기기 (선택사항)
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
