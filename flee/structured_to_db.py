"""
fleamarket_structured.json → DB 저장
(LLM 재실행 없이 순수하게 저장만)
"""
import json
import sys
import io
from db_manager import save_to_db, is_url_exist

# Windows 인코딩: BAT 파일의 chcp 65001이 처리


def structured_to_db(input_file="fleamarket_structured.json", skip_existing=True):
    """
    structured.json → DB 저장
    
    Args:
        input_file: 입력 JSON 파일
        skip_existing: True면 기존 URL 스킵, False면 덮어쓰기
    """
    
    print("=" * 80)
    print("💾 Structured JSON → DB 저장")
    print("=" * 80)
    print()
    
    # 1. structured.json 로드
    try:
        with open(input_file, "r", encoding="utf-8") as f:
            structured_data = json.load(f)
        print(f"✅ {input_file} 로드: {len(structured_data)}개")
    except FileNotFoundError:
        print(f"❌ {input_file} 파일이 없습니다.")
        print("   먼저 extract_to_json.py를 실행하세요.")
        return
    except json.JSONDecodeError as e:
        print(f"❌ JSON 파싱 오류: {e}")
        return
    
    # 2. DB 저장
    new_count = 0
    skip_count = 0
    fail_count = 0
    
    print(f"\n💾 DB 저장 시작...\n")
    
    for i, data in enumerate(structured_data, 1):
        url = data.get("url", "")
        market_name = data.get("market_name", "제목 미정")
        
        if not url:
            fail_count += 1
            continue
        
        # 이미 있으면 스킵
        if skip_existing and is_url_exist(url):
            skip_count += 1
            continue
        
        print(f"[{i}/{len(structured_data)}] {market_name[:40]}")
        
        # 이미지 URL 추출 (메타데이터에서)
        image_url = data.get("_source", {}).get("image_url", "")
        
        # DB 저장
        try:
            save_to_db(data, image_url)
            new_count += 1
            print(f"  ✅ 저장 완료")
        except Exception as e:
            fail_count += 1
            print(f"  ❌ 저장 실패: {e}")
    
    print()
    print("=" * 80)
    print(f"✅ DB 저장 완료")
    print(f"   신규 저장: {new_count}개")
    print(f"   기존 스킵: {skip_count}개")
    print(f"   실패: {fail_count}개")
    print("=" * 80)


if __name__ == "__main__":
    import sys
    
    force = "--force" in sys.argv or "-f" in sys.argv
    
    if force:
        print("⚠️  덮어쓰기 모드 활성화\n")
        structured_to_db(skip_existing=False)
    else:
        structured_to_db(skip_existing=True)

