@echo off
chcp 65001 > nul
echo ========================================
echo   플리마켓 DB 내용 확인
echo ========================================
echo.

REM 가상환경 활성화
call venv\Scripts\activate.bat

REM DB 확인 스크립트 실행
python check_db.py

echo.
pause

