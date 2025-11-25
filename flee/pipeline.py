# pipeline.py
"""
개선된 파이프라인:
detail.json → LLM 정제 → structured.json → DB 저장
"""
import json
import sys
import io

# Windows 인코딩: BAT 파일의 chcp 65001이 처리

from extract_to_json import extract_to_json
from structured_to_db import structured_to_db


def process_json_to_db(details_file="fleamarket_detail.json", force_update=False):
    """
    개선된 파이프라인:
    1. detail.json → structured.json (LLM 정제)
    2. structured.json → DB (저장)
    
    Args:
        details_file: 입력 파일
        force_update: True면 전체 재처리
    """
    
    print("=" * 80)
    print("🚀 플리마켓 데이터 처리 파이프라인")
    print("=" * 80)
    print()
    
    # STEP 1: LLM 정제 → structured.json
    print("📋 STEP 1: LLM 데이터 정제")
    print("-" * 80)
    structured_file = extract_to_json(details_file, force_update=force_update)
    
    if not structured_file:
        print("❌ 정제 실패")
        return
    
    print()
    print()
    
    # STEP 2: structured.json → DB
    print("📋 STEP 2: DB 저장")
    print("-" * 80)
    structured_to_db(structured_file, skip_existing=not force_update)
    
    print()
    print("=" * 80)
    print("✅ 전체 파이프라인 완료")
    print("=" * 80)


# 하위 호환성: 기존 함수명 유지
def process_json_to_db_legacy(details_file="fleamarket_detail.json"):
    """기존 방식 (하위 호환성)"""
    from llm_processor import extract_fleamarket_info
    from db_manager import save_to_db, is_url_exist
    
    try:
        with open(details_file, "r", encoding="utf-8") as f:
            details = json.load(f)
    except FileNotFoundError:
        print(f"❌ {details_file} 파일이 없습니다.")
        return
    except json.JSONDecodeError as e:
        print(f"❌ JSON 파싱 오류: {e}")
        return

    new_count = 0
    skip_count = 0
    fail_count = 0

    for detail in details:
        url = detail.get("url", "")
        title = detail.get("title", "").strip()
        raw_text = detail.get("raw_text", "").strip()
        image_url = detail.get("image_url", "")

        if not url:
            fail_count += 1
            continue

        if is_url_exist(url):
            skip_count += 1
            continue

        structured_data = extract_fleamarket_info(raw_text, url, title, image_url)

        if structured_data:
            save_to_db(structured_data, image_url)
            new_count += 1
        else:
            fail_count += 1

    print(f"📊 처리 결과 → 신규 {new_count}개 저장, 기존 {skip_count}개 스킵, 실패 {fail_count}개")


if __name__ == "__main__":
    import sys
    
    force = "--force" in sys.argv or "-f" in sys.argv
    legacy = "--legacy" in sys.argv
    
    if legacy:
        print("⚠️  레거시 모드 (structured.json 생성 안 함)\n")
        process_json_to_db_legacy()
    else:
        process_json_to_db(force_update=force)
