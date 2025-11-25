@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul

echo ================================================================================
echo                      플리마켓 전체 자동화 파이프라인
echo ================================================================================
echo.
echo   크롤링 → LLM 정제 → 로컬 DB → Supabase 저장
echo.
echo ================================================================================
echo.

REM 가상환경 활성화
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else (
    echo ❌ 가상환경이 없습니다. venv 폴더를 확인하세요.
    pause
    exit /b 1
)

echo 💡 실행 모드를 선택하세요:
echo.
echo   1. 전체 자동화 (크롤링 → LLM → DB → Supabase)
echo   2. 크롤링 스킵 (기존 데이터로 LLM → DB → Supabase)
echo   3. LLM 스킵 (크롤링 → 기존 structured.json → DB → Supabase)
echo   4. 크롤링/LLM 스킵 (기존 데이터로 DB → Supabase만)
echo   5. 전체 재처리 (--force: 모든 데이터 다시 처리)
echo.
set /p mode="선택 (1-5): "

if "%mode%"=="1" goto mode_full
if "%mode%"=="2" goto mode_skip_crawling
if "%mode%"=="3" goto mode_skip_llm
if "%mode%"=="4" goto mode_skip_both
if "%mode%"=="5" goto mode_force
goto invalid_choice

:mode_full
echo.
echo 🚀 전체 자동화 실행...
echo.
python master_pipeline.py
goto end

:mode_skip_crawling
echo.
echo 🚀 크롤링 스킵 모드...
echo.
python master_pipeline.py --skip-crawling
goto end

:mode_skip_llm
echo.
echo 🚀 LLM 스킵 모드...
echo.
python master_pipeline.py --skip-llm
goto end

:mode_skip_both
echo.
echo 🚀 크롤링/LLM 스킵 모드 (DB 저장만)...
echo.
python master_pipeline.py --skip-crawling --skip-llm
goto end

:mode_force
echo.
echo 🚀 전체 재처리 모드 (--force)...
echo ⚠️  API 비용이 많이 발생할 수 있습니다!
echo.
set /p confirm="계속하시겠습니까? (Y/N): "
if /i "%confirm%"=="Y" (
    python master_pipeline.py --force
) else (
    echo 취소되었습니다.
)
goto end

:invalid_choice
echo.
echo ❌ 잘못된 선택입니다.
echo.
pause
exit /b 1

:end
if errorlevel 1 (
    echo.
    echo ================================================================================
    echo   ❌ 실행 실패
    echo ================================================================================
    echo.
    echo 로그 파일을 확인하세요: logs 폴더
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================================================
echo   ✅ 전체 파이프라인 완료!
echo ================================================================================
echo.
echo 💡 다음 단계:
echo   - 로그 확인: logs 폴더
echo   - DB 확인: check_db.bat 실행
echo.
pause
