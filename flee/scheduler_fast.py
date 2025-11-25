"""
플리마켓 크롤링 파이프라인 (병렬 처리 고속 버전)
"""
import subprocess
import sys
import os
from datetime import datetime
import io

# Windows 인코딩: BAT 파일의 chcp 65001이 처리

def run_script_subprocess(script_name):
    """subprocess로 스크립트 실행"""
    print(f"🚀 {script_name} 실행 시작...")
    result = subprocess.run([sys.executable, script_name])
    
    if result.returncode == 0:
        print(f"✅ {script_name} 실행 완료")
    else:
        print(f"❌ {script_name} 실행 실패 (Exit code: {result.returncode})")
        sys.exit(1)

def main():
    print("=" * 60)
    print(f" 🚀 플리마켓 크롤링 파이프라인 (병렬 처리 고속 버전)")
    print(f" ⏰ 시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print()

    base_dir = os.path.dirname(os.path.abspath(__file__))

    # 1. 게시물 목록 크롤링 (병렬)
    print("📋 STEP 1: 게시물 목록 크롤링")
    print("-" * 60)
    run_script_subprocess(os.path.join(base_dir, "flea_list_fast.py"))
    print()

    # 2. 상세 게시글 크롤링 (병렬)
    print("📄 STEP 2: 상세 게시글 크롤링")
    print("-" * 60)
    run_script_subprocess(os.path.join(base_dir, "flea_text_fast.py"))
    print()

    # 3. JSON → DB 정제 및 저장 (함수 직접 호출)
    print("💾 STEP 3: 데이터 정제 및 DB 저장")
    print("-" * 60)
    print("🚀 pipeline.py 실행 시작...")
    
    try:
        # subprocess 대신 함수 직접 호출
        from pipeline import process_json_to_db
        process_json_to_db(force_update=False)
        print("✅ pipeline.py 실행 완료")
    except Exception as e:
        print(f"❌ pipeline.py 실행 실패: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    print()

    print("=" * 60)
    print(f" 🎉 전체 파이프라인 실행 완료!")
    print(f" ⏰ 종료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

if __name__ == "__main__":
    main()

