"""
파일 자동 정리 스크립트
"""
import os
import shutil

# 폴더 구조 정의
FOLDERS = {
    "core": [
        "flea_list_fast.py",
        "flea_text_fast.py", 
        "extract_to_json.py",
        "structured_to_db.py",
        "pipeline.py",
        "scheduler_fast.py",
        "llm_processor.py",
        "db_manager.py"
    ],
    "scripts": [
        "run_fast.bat",
        "check_db.bat",
        "save_to_db.bat",
        "init_db.py",
        "check_db.py"
    ],
    "data": [
        "fleamarket_posts.json",
        "fleamarket_detail.json",
        "fleamarket_structured.json",
        "fleamarket.db",
        "fleamarket_backup_*.db"
    ],
    "docs": [
        "README_FAST.md",
        "사용가이드.md",
        "워크플로우_가이드.md",
        "성능비교.md",
        "이미지_OCR_가이드.md",
        "개선사항_요약.md",
        "파일_정리_가이드.md"
    ],
    "dev": [
        "test_requests.py",
        "test_single_image.py",
        "test_workflow.bat",
        "debug_image.py",
        "debug_and_fix.bat",
        "fix_time.py",
        "fix_time.bat",
        "fix_all.bat",
        "fix_existing_data.py",
        "fix_encoding.py",
        "merge_images.py",
        "compare_structure.py",
        "quick_stats.py"
    ],
    "old": [
        "flea_list.py",
        "flea_text.py",
        "scheduler.py",
        "crolling.py",
        "main.py"
    ]
}

def organize_files(dry_run=True):
    """
    파일을 폴더별로 정리
    
    Args:
        dry_run: True면 미리보기만, False면 실제 실행
    """
    
    print("=" * 80)
    if dry_run:
        print("📋 파일 정리 미리보기 (실제 이동 안 함)")
    else:
        print("🚀 파일 정리 실행 중...")
    print("=" * 80)
    print()
    
    # 폴더 생성
    for folder in FOLDERS.keys():
        if not os.path.exists(folder):
            if dry_run:
                print(f"📁 생성 예정: {folder}/")
            else:
                os.makedirs(folder, exist_ok=True)
                print(f"✅ 폴더 생성: {folder}/")
    
    print()
    print("-" * 80)
    print("📦 파일 이동 계획:")
    print("-" * 80)
    
    move_count = 0
    missing_count = 0
    
    for folder, files in FOLDERS.items():
        print(f"\n📁 {folder}/ 폴더:")
        
        for file_pattern in files:
            # 와일드카드 처리
            if "*" in file_pattern:
                import glob
                matching_files = glob.glob(file_pattern)
                for file in matching_files:
                    if os.path.exists(file):
                        print(f"  ✅ {file} → {folder}/{file}")
                        if not dry_run:
                            shutil.move(file, f"{folder}/{file}")
                        move_count += 1
            else:
                if os.path.exists(file_pattern):
                    print(f"  ✅ {file_pattern} → {folder}/{file_pattern}")
                    if not dry_run:
                        shutil.move(file_pattern, f"{folder}/{file_pattern}")
                    move_count += 1
                else:
                    print(f"  ⚠️  {file_pattern} (없음)")
                    missing_count += 1
    
    print()
    print("=" * 80)
    print(f"📊 요약")
    print("=" * 80)
    print(f"  이동 대상: {move_count}개")
    print(f"  없는 파일: {missing_count}개")
    
    if dry_run:
        print()
        print("=" * 80)
        print("💡 실제로 정리하려면:")
        print("=" * 80)
        print("  python organize_files.py --execute")
        print()
        print("⚠️  주의: 이동 후 BAT 파일 경로 수정 필요!")
    else:
        print()
        print("=" * 80)
        print("✅ 파일 정리 완료!")
        print("=" * 80)
        print()
        print("🔧 다음 단계: BAT 파일 경로 업데이트")
        print("  run_fast.bat, check_db.bat 등에서")
        print("  Python 파일 경로를 ../core/xxx.py로 수정하세요.")


def show_essential_only():
    """필수 파일만 표시"""
    
    print("=" * 80)
    print("⭐ 최소 필수 파일 (이것만 있으면 작동)")
    print("=" * 80)
    print()
    
    essential = [
        ("🚀 실행", "run_fast.bat", "메인 실행 파일"),
        ("📋 크롤링", "flea_list_fast.py", "목록 수집"),
        ("📄 크롤링", "flea_text_fast.py", "상세 수집"),
        ("🤖 정제", "extract_to_json.py", "LLM 정제"),
        ("💾 저장", "structured_to_db.py", "DB 저장"),
        ("🔗 연결", "pipeline.py", "파이프라인"),
        ("⏰ 관리", "scheduler_fast.py", "스케줄러"),
        ("🧠 LLM", "llm_processor.py", "LLM 처리"),
        ("🗄️ DB", "db_manager.py", "DB 관리"),
        ("🌐 드라이버", "chromedriver.exe", "크롤링"),
        ("⚙️ 설정", "requirements.txt", "패키지"),
        ("🔑 환경", ".env", "API 키")
    ]
    
    for category, file, desc in essential:
        exists = "✅" if os.path.exists(file) else "❌"
        print(f"{exists} {category:8} {file:30} - {desc}")
    
    print()
    print("-" * 80)
    print("총 12개 파일만 있으면 완전히 작동합니다!")
    print("-" * 80)


def list_deletable():
    """삭제 가능한 파일 목록"""
    
    print()
    print("=" * 80)
    print("🗑️ 안전하게 삭제 가능한 파일")
    print("=" * 80)
    print()
    
    deletable = []
    
    # dev 폴더 파일들
    deletable.extend(FOLDERS["dev"])
    
    # old 폴더 파일들
    deletable.extend(FOLDERS["old"])
    
    # 문서 (선택)
    print("📚 문서 파일 (참고만 필요):")
    for doc in FOLDERS["docs"]:
        if os.path.exists(doc):
            print(f"  📄 {doc}")
    
    print()
    print("🧪 개발/테스트 파일 (삭제 가능):")
    for dev in FOLDERS["dev"]:
        if os.path.exists(dev):
            print(f"  🗑️ {dev}")
            deletable.append(dev)
    
    print()
    print("🗂️ 구버전 파일 (삭제 가능):")
    for old in FOLDERS["old"]:
        if os.path.exists(old):
            print(f"  🗑️ {old}")
            deletable.append(old)
    
    return list(set(deletable))  # 중복 제거


if __name__ == "__main__":
    import sys
    
    if "--execute" in sys.argv or "-e" in sys.argv:
        print("⚠️  실제로 파일을 이동합니다!\n")
        response = input("계속하시겠습니까? (yes/no): ")
        if response.lower() in ["yes", "y"]:
            organize_files(dry_run=False)
        else:
            print("❌ 취소됨")
    
    elif "--delete" in sys.argv or "-d" in sys.argv:
        deletable = list_deletable()
        print()
        print(f"총 {len(deletable)}개 파일 삭제 가능")
        print()
        response = input("삭제하시겠습니까? (yes/no): ")
        if response.lower() in ["yes", "y"]:
            for file in deletable:
                if os.path.exists(file):
                    os.remove(file)
                    print(f"🗑️ 삭제: {file}")
            print("\n✅ 삭제 완료!")
        else:
            print("❌ 취소됨")
    
    elif "--essential" in sys.argv:
        show_essential_only()
    
    else:
        # 기본: 미리보기
        organize_files(dry_run=True)
        print()
        list_deletable()
        print()
        print("=" * 80)
        print("💡 옵션:")
        print("=" * 80)
        print("  python organize_files.py              (미리보기)")
        print("  python organize_files.py --essential  (필수 파일만 표시)")
        print("  python organize_files.py --execute    (폴더 정리 실행)")
        print("  python organize_files.py --delete     (불필요 파일 삭제)")

