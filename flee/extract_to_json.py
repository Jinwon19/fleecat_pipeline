"""
fleamarket_detail.json → LLM 정제 → fleamarket_structured.json
(DB 저장하지 않고 JSON만 생성)
"""
import json
import sys
import io
from llm_processor import extract_fleamarket_info

# Windows 인코딩: BAT 파일의 chcp 65001이 처리

OUTPUT_FILE = "fleamarket_structured.json"

def extract_to_json(input_file="fleamarket_detail.json", force_update=False):
    """
    detail.json → LLM 정제 → structured.json
    
    Args:
        input_file: 입력 JSON 파일
        force_update: True면 전체 재처리, False면 신규만 처리
    """
    
    print("=" * 80)
    print("🔄 LLM 데이터 정제 (JSON 저장)")
    print("=" * 80)
    print()
    
    # 1. detail.json 로드
    try:
        with open(input_file, "r", encoding="utf-8") as f:
            details = json.load(f)
        print(f"✅ {input_file} 로드: {len(details)}개")
    except FileNotFoundError:
        print(f"❌ {input_file} 파일이 없습니다.")
        return
    except json.JSONDecodeError as e:
        print(f"❌ JSON 파싱 오류: {e}")
        return
    
    # 2. 기존 structured.json 로드 (있으면)
    existing_structured = []
    existing_urls = set()
    
    if not force_update:
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                existing_structured = json.load(f)
            existing_urls = {s["url"] for s in existing_structured}
            print(f"✅ 기존 structured 데이터: {len(existing_structured)}개")
        except FileNotFoundError:
            print("📝 신규 structured.json 생성")
        except json.JSONDecodeError:
            print("⚠️  기존 파일 손상 - 처음부터 재생성")
    else:
        print("🔄 전체 재처리 모드")
    
    # 3. LLM 정제
    new_structured = []
    success_count = 0
    skip_count = 0
    fail_count = 0
    
    print(f"\n🤖 LLM 정제 시작 ({len(details)}개 처리)...\n")
    
    for i, detail in enumerate(details, 1):
        url = detail.get("url", "")
        title = detail.get("title", "").strip()
        raw_text = detail.get("raw_text", "").strip()
        image_url = detail.get("image_url", "")
        original_place = detail.get("place", "").strip()  # ✅ 원본 크롤링 장소 추출
        post_date = detail.get("post_date", "").strip()  # ✅ 게시글 작성일 추출

        if not url:
            fail_count += 1
            continue

        # 이미 처리된 URL이면 스킵
        if not force_update and url in existing_urls:
            skip_count += 1
            continue

        print(f"[{i}/{len(details)}] {title[:40]}")

        # LLM 정제 (원본 장소 정보 + 게시글 작성일 전달)
        structured_data = extract_fleamarket_info(raw_text, url, title, image_url, original_place, post_date)
        
        if structured_data:
            # 추가 메타데이터
            structured_data["_source"] = {
                "title": title,
                "image_url": image_url,
                "raw_text_length": len(raw_text)
            }
            
            new_structured.append(structured_data)
            success_count += 1
            print(f"  ✅ 성공")
        else:
            fail_count += 1
            print(f"  ❌ 실패")
    
    # 4. 기존 + 신규 병합
    all_structured = existing_structured + new_structured
    
    # 5. JSON 저장
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_structured, f, ensure_ascii=False, indent=2)
    
    print()
    print("=" * 80)
    print(f"✅ JSON 저장 완료: {OUTPUT_FILE}")
    print(f"   총 데이터: {len(all_structured)}개")
    print(f"   신규 추가: {success_count}개")
    print(f"   기존 유지: {skip_count}개")
    print(f"   실패: {fail_count}개")
    print("=" * 80)
    
    return OUTPUT_FILE


if __name__ == "__main__":
    import sys
    
    force = "--force" in sys.argv or "-f" in sys.argv
    
    if force:
        print("⚠️  전체 재처리 모드 활성화\n")
    
    extract_to_json(force_update=force)

