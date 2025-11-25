#!/bin/bash
# Railway 환경 변수 설정 스크립트

echo "🚀 Railway 환경 변수 설정을 시작합니다..."

# 1. 기본 설정
echo "📝 기본 설정 중..."
railway variables set NODE_ENV=production
railway variables set PORT=3000

# 2. Supabase 설정
echo "📝 Supabase 설정 중..."
railway variables set SUPABASE_URL="https://ymqnpsiephgvdzzizsns.supabase.co"
railway variables set SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsImtpZCI6InJ2REZWRUc3R3RYMTF6SWUiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3ltcW5wc2llcGhndmR6eml6c25zLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI2NzVkNGY3ZS05MWQ0LTQ3MDYtYTgxMS0yYTJhMzgxYmRjNzQiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYwMDg0NjA5LCJpYXQiOjE3NjAwODEwMDksImVtYWlsIjoiIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6e30sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NjAwODEwMDl9XSwic2Vzc2lvbl9pZCI6IjczZGFmNGJkLTE2ZTItNGE0ZS1iMzNkLTIyOGY3ZDg0NzNiNCIsImlzX2Fub255bW91cyI6ZmFsc2V9.example"

# ⚠️ 주의: SUPABASE_SERVICE_KEY는 보안상 중요합니다. 실제 값을 입력하세요.
echo "⚠️  SUPABASE_SERVICE_KEY를 입력하세요:"
read -p "Service Key: " SERVICE_KEY
railway variables set SUPABASE_SERVICE_KEY="$SERVICE_KEY"

# 3. Database URL (Supabase)
echo "📝 Database URL을 입력하세요 (Supabase PostgreSQL):"
echo "형식: postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
read -p "DATABASE_URL: " DATABASE_URL
railway variables set DATABASE_URL="$DATABASE_URL"

# 4. JWT Secret 생성
echo "📝 JWT Secret을 생성합니다..."
JWT_SECRET=$(openssl rand -base64 32)
railway variables set JWT_SECRET="$JWT_SECRET"
railway variables set JWT_EXPIRES_IN="7d"
echo "✅ JWT_SECRET 생성 완료: $JWT_SECRET"

# 5. 기타 설정
echo "📝 기타 설정 중..."
railway variables set MAX_FILE_SIZE=5242880
railway variables set RATE_LIMIT_WINDOW_MS=900000
railway variables set RATE_LIMIT_MAX_REQUESTS=100
railway variables set LOG_LEVEL=info

echo "✅ 환경 변수 설정 완료!"
echo ""
echo "🚀 이제 배포를 시작합니다..."
echo "railway up 명령어를 실행하면 배포가 시작됩니다."
echo ""
echo "배포 후 나온 URL을 사용하여 다음 환경 변수를 추가로 설정하세요:"
echo "  railway variables set FRONTEND_URL='https://your-app.railway.app'"
echo "  railway variables set ALLOWED_ORIGINS='https://your-app.railway.app'"
