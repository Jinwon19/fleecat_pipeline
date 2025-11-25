@echo off
chcp 65001 >nul
echo ============================================
echo 🚀 Railway 배포 스크립트
echo ============================================
echo.

cd /d "D:\fleecat\백엔드\fleecat-backend"

echo 📝 [1/3] Railway 환경 변수 설정 중...
echo.

REM 기본 설정
call railway variables set NODE_ENV=production
call railway variables set PORT=3000

REM Supabase 설정
call railway variables set SUPABASE_URL=https://ymqnpsiephgvdzzizsns.supabase.co
call railway variables set SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltcW5wc2llcGhndmR6eml6c25zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NjI4MzMsImV4cCI6MjA3NDMzODgzM30.DCQDSdlna4WXRL1moOnng0WKcAYkEiaYc961zdhajuY"
call railway variables set SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltcW5wc2llcGhndmR6eml6c25zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODc2MjgzMywiZXhwIjoyMDc0MzM4ODMzfQ.KsduPA0J1FmGJ20WMB4xXaO6EB8oqZT0xU6OWGFUaBs"

REM Database 설정
call railway variables set DATABASE_URL="postgresql://postgres.ymqnpsiephgvdzzizsns:BBx-+AtKfZPq3Wz@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
call railway variables set DIRECT_URL="postgresql://postgres.ymqnpsiephgvdzzizsns:BBx-+AtKfZPq3Wz@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"

REM JWT 설정
call railway variables set JWT_SECRET="b5b7f800eceb42672619a38878917268610056f0d6edf2b32c081de688b3ba3dd3c48d1adf40fc0ad498c9a47ff424701b3fa1d6c8be3cfe2f247c4a1446f879"
call railway variables set JWT_EXPIRES_IN=7d

REM 파일 업로드 설정
call railway variables set MAX_FILE_SIZE=5242880

REM Rate Limiting 설정
call railway variables set RATE_LIMIT_WINDOW_MS=900000
call railway variables set RATE_LIMIT_MAX_REQUESTS=100

REM 로깅 설정
call railway variables set LOG_LEVEL=info

echo.
echo ✅ 환경 변수 설정 완료!
echo.

echo 📦 [2/3] Prisma 클라이언트 생성 중...
call npx prisma generate
echo.

echo 🚀 [3/3] Railway에 배포 중...
echo.
call railway up

echo.
echo ============================================
echo ✅ 배포 완료!
echo ============================================
echo.
echo 📌 다음 단계:
echo.
echo 1. Railway Dashboard에서 배포 상태 확인:
echo    https://railway.com/project/76547eab-79b0-4e3a-af23-11c4928ab88d
echo.
echo 2. 도메인 생성 후 다음 명령어 실행:
echo    railway variables set FRONTEND_URL=https://your-app.railway.app
echo    railway variables set ALLOWED_ORIGINS=https://your-app.railway.app
echo.
echo 3. Supabase Dashboard에서 OAuth Redirect URL 업데이트:
echo    https://your-app.railway.app/auth/callback
echo.
pause
