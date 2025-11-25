@echo off
chcp 65001 > nul
echo ========================================
echo   플리마켓 크롤링 (병렬 처리 고속 버전)
echo ========================================
echo.

REM 가상환경 활성화
call venv\Scripts\activate.bat

REM 패키지 설치 확인
echo 📦 필요한 패키지 확인 중...
python -c "import requests, bs4, selenium, tqdm" 2>nul
if errorlevel 1 (
    echo ⚠️  패키지가 설치되지 않았습니다. 설치 중...
    pip install -q requests beautifulsoup4 selenium tqdm
)

echo.
echo 🚀 크롤링 시작...
echo.

REM 병렬 처리 버전 실행
python scheduler_fast.py

echo.
echo ========================================
echo   실행 완료
echo ========================================
pause

