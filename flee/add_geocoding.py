"""
주소를 좌표(위도, 경도)로 변환하여 Supabase에 추가
"""
import os
import time
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

# Supabase 설정
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Kakao API (무료, 하루 300,000회)
KAKAO_API_KEY = os.getenv("KAKAO_REST_API_KEY")

# 또는 Google Geocoding API
# GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")


def clean_place_text(text):
    """장소명 정제 - 검색에 방해되는 요소 제거"""
    if not text:
        return ""

    import re

    # 1단계: 괄호 제거
    cleaned = re.sub(r'\([^)]*\)', '', text)

    # 2단계: 층수 정보 제거
    cleaned = re.sub(r'\d+층', '', cleaned)

    # 3단계: 특수문자 정리
    cleaned = re.sub(r'[^가-힣a-zA-Z0-9\s\-]', ' ', cleaned)

    # 4단계: 공백 정리
    cleaned = ' '.join(cleaned.split())

    return cleaned.strip()


def geocode_kakao_address(address):
    """Kakao Address Search API - 주소 검색"""
    if not KAKAO_API_KEY:
        print("⚠️  KAKAO_API_KEY가 없습니다. .env에 추가하세요.")
        return None

    url = "https://dapi.kakao.com/v2/local/search/address.json"
    headers = {"Authorization": f"KakaoAK {KAKAO_API_KEY}"}
    params = {"query": address}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()

        if data.get('documents'):
            doc = data['documents'][0]
            return {
                "lat": float(doc['y']),
                "lng": float(doc['x']),
                "address": doc.get('address_name', address),
                "method": "address_search"
            }
    except Exception as e:
        print(f"  ⚠️  Address Search 오류: {e}")

    return None


def geocode_kakao_keyword(keyword):
    """Kakao Keyword Search API - 장소명 검색"""
    if not KAKAO_API_KEY:
        return None

    url = "https://dapi.kakao.com/v2/local/search/keyword.json"
    headers = {"Authorization": f"KakaoAK {KAKAO_API_KEY}"}
    params = {"query": keyword}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()

        if data.get('documents'):
            doc = data['documents'][0]  # 가장 정확도 높은 결과
            return {
                "lat": float(doc['y']),
                "lng": float(doc['x']),
                "address": doc.get('address_name', keyword),
                "place_name": doc.get('place_name', ''),
                "method": "keyword_search"
            }
    except Exception as e:
        print(f"  ⚠️  Keyword Search 오류: {e}")

    return None


def geocode_kakao(address):
    """
    다단계 Geocoding 전략:
    1. Address Search (주소 검색)
    2. Keyword Search (장소명 검색 - 원본)
    3. Keyword Search (정제된 장소명)
    """
    print(f"  🔍 검색 시작: '{address}'")

    # Step 1: Address Search
    result = geocode_kakao_address(address)
    if result:
        print(f"  ✅ [주소검색] 성공: {result['method']}")
        return result

    # Step 2: Keyword Search (원본)
    result = geocode_kakao_keyword(address)
    if result:
        print(f"  ✅ [키워드검색-원본] 성공: {result.get('place_name', '')}")
        return result

    # Step 3: Keyword Search (정제)
    cleaned = clean_place_text(address)
    if cleaned and cleaned != address:
        print(f"  🧹 정제 시도: '{cleaned}'")
        result = geocode_kakao_keyword(cleaned)
        if result:
            print(f"  ✅ [키워드검색-정제] 성공: {result.get('place_name', '')}")
            return result

    return None


def geocode_google(address):
    """Google Geocoding API로 주소 → 좌표 변환"""
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    
    if not GOOGLE_API_KEY:
        return None
    
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "address": address,
        "key": GOOGLE_API_KEY,
        "region": "kr"  # 한국 우선
    }
    
    try:
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        if data['status'] == 'OK' and data['results']:
            location = data['results'][0]['geometry']['location']
            return {
                "lat": location['lat'],
                "lng": location['lng'],
                "address": data['results'][0]['formatted_address']
            }
    except Exception as e:
        print(f"  ❌ Geocoding 오류: {e}")
    
    return None


def add_coordinates_to_supabase():
    """Supabase의 모든 행사에 좌표 추가"""

    print("=" * 80)
    print("🗺️ 주소 → 좌표 변환 및 Supabase 업데이트")
    print("=" * 80)
    print()

    # 실패 케이스를 기록할 리스트
    failed_cases = []
    
    # 1. 테이블에 lat, lng 컬럼 추가 (최초 1회만)
    print("📝 1단계: 테이블 스키마 확인")
    print("-" * 80)
    print("""
Supabase Dashboard → SQL Editor에서 다음 쿼리 실행:

ALTER TABLE markets 
ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_markets_location ON markets(lat, lng);
""")
    print()
    input("위 쿼리를 실행한 후 Enter를 누르세요...")
    
    # 2. 좌표 없는 데이터 가져오기
    print()
    print("📝 2단계: 좌표 변환 시작")
    print("-" * 80)
    
    try:
        response = supabase.table("markets").select("id, market_name, place, lat, lng").execute()
        markets = response.data
        
        print(f"📊 총 {len(markets)}개 행사")
        
        # 좌표 없는 것만 필터링
        no_coords = [m for m in markets if not m.get("lat") or not m.get("lng")]
        print(f"🎯 좌표 없음: {len(no_coords)}개")
        print()
        
        if not no_coords:
            print("✅ 모든 행사에 좌표가 있습니다!")
            return
        
        success = 0
        fail = 0
        
        for i, market in enumerate(no_coords, 1):
            market_id = market["id"]
            market_name = market["market_name"]
            place = market["place"]
            
            print(f"[{i}/{len(no_coords)}] {market_name[:30]}")
            print(f"  장소: {place}")
            
            if not place or place == "미정":
                print(f"  ⚠️  장소 정보 없음 - 스킵")
                failed_cases.append({
                    "id": market_id,
                    "market_name": market_name,
                    "place": place,
                    "reason": "장소 정보 없음"
                })
                fail += 1
                continue

            # Geocoding 시도
            coords = geocode_kakao(place)

            # Kakao 실패시 Google 시도
            if not coords:
                coords = geocode_google(place)

            if coords:
                # Supabase 업데이트
                try:
                    supabase.table("markets").update({
                        "lat": coords["lat"],
                        "lng": coords["lng"]
                    }).eq("id", market_id).execute()

                    print(f"  ✅ 좌표: ({coords['lat']:.6f}, {coords['lng']:.6f})")
                    print(f"  📍 방법: {coords.get('method', 'google')}")
                    success += 1
                except Exception as e:
                    print(f"  ❌ 업데이트 실패: {e}")
                    failed_cases.append({
                        "id": market_id,
                        "market_name": market_name,
                        "place": place,
                        "reason": f"DB 업데이트 실패: {str(e)}"
                    })
                    fail += 1
            else:
                print(f"  ❌ Geocoding 실패")
                failed_cases.append({
                    "id": market_id,
                    "market_name": market_name,
                    "place": place,
                    "reason": "Geocoding 실패 (모든 검색 방법 실패)"
                })
                fail += 1
            
            # API 제한 방지 (초당 10회)
            time.sleep(0.1)
            print()
        
        print("=" * 80)
        print(f"✅ 좌표 변환 완료")
        print(f"   성공: {success}개")
        print(f"   실패: {fail}개")
        print("=" * 80)

        # 실패 케이스 저장
        if failed_cases:
            import json
            log_file = "geocoding_failures.json"
            with open(log_file, 'w', encoding='utf-8') as f:
                json.dump(failed_cases, f, ensure_ascii=False, indent=2)
            print(f"\n📋 실패 케이스가 '{log_file}'에 저장되었습니다.")
            print(f"   파일을 확인하여 수동으로 수정하거나 프롬프트를 개선하세요.")

    except Exception as e:
        print(f"❌ 오류: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    add_coordinates_to_supabase()

