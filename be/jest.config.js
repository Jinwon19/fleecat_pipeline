module.exports = {
  // Node.js 환경에서 테스트 실행
  testEnvironment: 'node',

  // 커버리지 리포트 저장 위치
  coverageDirectory: 'coverage',

  // 커버리지 측정 대상 파일
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',           // 서버 진입점 제외
    '!src/app.js',              // Express 앱 설정 제외
    '!**/node_modules/**',
    '!**/prisma/**'
  ],

  // 테스트 파일 패턴
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // 커버리지 최소 기준 (80% 목표)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // 테스트 환경 설정 파일
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // 테스트 타임아웃 (10초)
  testTimeout: 10000,

  // 자세한 출력
  verbose: true,

  // 병렬 실행 비활성화 (DB 충돌 방지)
  maxWorkers: 1
};
