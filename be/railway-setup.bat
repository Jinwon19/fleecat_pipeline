@echo off
REM Railway 환경 변수 설정 스크립트 (Windows)

echo 🚀 Railway 환경 변수 설정을 시작합니다...

REM 1. 기본 설정
echo 📝 기본 설정 중...
call railway variables set NODE_ENV=production
call railway variables set PORT=3000

REM 2. Supabase 설정
echo 📝 Supabase 설정 중...
call railway variables set SUPABASE_URL=https://ymqnpsiephgvdzzizsns.supabase.co
call railway variables set SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsImtpZCI6InJ2REZWRUc3R3RYMTF6SWUiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3ltcW5wc2llcGhndmR6eml6c25zLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI2NzVkNGY3ZS05MWQ0LTQ3MDYtYTgxMS0yYTJhMzgxYmRjNzQiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYwMDg0NjA5LCJpYXQiOjE3NjAwODEwMDksImVtYWlsIjoiIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6e30sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NjAwODEwMDl9XSwic2Vzc2lvbl9pZCI6IjczZGFmNGJkLTE2ZTItNGE0ZS1iMzNkLTIyOGY3ZDg0NzNiNCIsImlzX2Fub255bW91cyI6ZmFsc2V9.example"

REM ⚠️ 주의: 아래 값들은 수동으로 입력해야 합니다
echo.
echo ⚠️  다음 명령어들을 복사해서 직접 실행하세요:
echo.
echo railway variables set SUPABASE_SERVICE_KEY="여기에-실제-서비스-키-입력"
echo railway variables set DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
echo railway variables set JWT_SECRET="랜덤-시크릿-키-여기에-입력"
echo.
pause

REM 3. 기타 설정
echo 📝 기타 설정 중...
call railway variables set JWT_EXPIRES_IN=7d
call railway variables set MAX_FILE_SIZE=5242880
call railway variables set RATE_LIMIT_WINDOW_MS=900000
call railway variables set RATE_LIMIT_MAX_REQUESTS=100
call railway variables set LOG_LEVEL=info

echo.
echo ✅ 기본 환경 변수 설정 완료!
echo.
echo 🚀 이제 다음 단계를 진행하세요:
echo.
echo 1. 위에 표시된 명령어들을 복사해서 실행 (SERVICE_KEY, DATABASE_URL, JWT_SECRET)
echo 2. railway up 명령어 실행하여 배포
echo 3. 배포 완료 후 나온 URL을 확인
echo 4. 다음 명령어로 추가 환경 변수 설정:
echo    railway variables set FRONTEND_URL=https://your-app.railway.app
echo    railway variables set ALLOWED_ORIGINS=https://your-app.railway.app
echo.
pause
