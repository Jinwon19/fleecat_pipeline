@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul
echo ========================================
echo   JSON 데이터를 DB로 저장 (개선 버전)
echo ========================================
echo.

REM 가상환경 활성화
call venv\Scripts\activate.bat

echo 📦 JSON 파일 확인 중...
if not exist fleamarket_posts.json (
    echo ❌ fleamarket_posts.json 파일이 없습니다.
    echo    먼저 크롤링을 실행하세요.
    pause
    exit /b 1
)

if not exist fleamarket_detail.json (
    echo ❌ fleamarket_detail.json 파일이 없습니다.
    echo    먼저 크롤링을 실행하세요.
    pause
    exit /b 1
)

echo ✅ JSON 파일 확인 완료
echo.

REM structured.json 존재 확인
if exist fleamarket_structured.json (
    echo 💡 structured.json 발견!
    echo.
    echo 옵션 선택:
    echo 1. 빠른 저장 (structured.json 재사용, API 비용 0원)
    echo 2. 재정제 후 저장 (LLM 재실행, API 비용 발생)
    echo.
    set /p mode="선택 (1 or 2): "
    
    if "!mode!"=="1" goto quick_save
    if "!mode!"=="2" goto full_pipeline
    
    REM 기본값: 빠른 저장
    goto quick_save
) else (
    echo ℹ️  structured.json 없음 → 전체 파이프라인 실행
    goto full_pipeline
)

:quick_save
echo.
echo 💾 빠른 저장 모드 (structured.json → DB)
echo ========================================
python structured_to_db.py
goto end

:full_pipeline
echo.
echo 💾 전체 파이프라인 (detail → structured → DB)
echo    LLM 처리 중... 시간이 걸릴 수 있습니다.
echo ========================================
python pipeline.py
goto end

:end
if errorlevel 1 (
    echo.
    echo ❌ 저장 실패
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ✅ DB 저장 완료
echo ========================================
echo.
echo 💡 DB 내용 확인: check_db.bat 실행
echo.
pause

