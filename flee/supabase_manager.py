"""
Supabase 데이터베이스 관리 모듈
db_manager.py와 동일한 인터페이스를 제공하되 Supabase를 사용
"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

# Supabase 설정
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # .env의 실제 변수명과 일치

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ SUPABASE_URL 또는 SUPABASE_SERVICE_KEY가 설정되지 않았습니다. .env 파일을 확인하세요!")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def sanitize_value(value, allow_empty=False):
    """
    "미정" 또는 빈 값을 적절한 형식으로 변환

    Args:
        value: 변환할 값
        allow_empty: True면 빈 문자열 반환, False면 None 반환

    Returns:
        변환된 값 (빈 문자열 또는 None)
    """
    if not value or value == "미정":
        return "" if allow_empty else None
    return value


def is_url_exist(url: str) -> bool:
    """해당 url이 markets 테이블에 이미 존재하는지 확인"""
    try:
        response = supabase.table("markets").select("id").eq("url", url).execute()
        return len(response.data) > 0
    except Exception as e:
        print(f"❌ URL 존재 확인 오류: {e}")
        return False


def save_to_db(data, image_url=None):
    """플리마켓 데이터 저장 (markets + sessions)"""
    if not data.get("url"):
        print("❌ URL 없음 → 저장 안 함")
        return False

    try:
        url = data["url"]
        market_name = data.get("market_name", "제목 미정")
        place = data.get("place", "")  # "미정" 대신 빈 문자열

        # 1) markets 중복 확인 및 저장/업데이트
        response = supabase.table("markets").select("id").eq("url", url).execute()

        if response.data:
            # 기존 데이터가 있으면 업데이트
            market_id = response.data[0]["id"]
            supabase.table("markets").update({
                "market_name": market_name,
                "place": place,
                "image_url": image_url or ""
            }).eq("id", market_id).execute()
            print(f"  🔄 기존 행사 업데이트: {market_name}")
        else:
            # 새로운 데이터 삽입
            insert_response = supabase.table("markets").insert({
                "market_name": market_name,
                "place": place,
                "url": url,
                "image_url": image_url or ""
            }).execute()
            market_id = insert_response.data[0]["id"]
            print(f"  ✅ 신규 행사 저장: {market_name}")

        # 2) sessions 저장
        # 기존 세션 삭제 후 재생성 (업데이트 간단화)
        supabase.table("sessions").delete().eq("market_id", market_id).execute()

        # 새로운 세션 삽입 ("미정" 값을 적절히 변환)
        for session in data.get("sessions", []):
            supabase.table("sessions").insert({
                "market_id": market_id,
                "start_date": sanitize_value(session.get("start_date")),  # NULL 반환 (DATE 타입)
                "end_date": sanitize_value(session.get("end_date")),      # NULL 반환 (DATE 타입)
                "start_time": sanitize_value(session.get("start_time")),  # NULL 허용
                "end_time": sanitize_value(session.get("end_time")),      # NULL 허용
                "notes": session.get("notes", "")
            }).execute()

        return True

    except Exception as e:
        print(f"❌ Supabase 저장 오류: {e}")
        import traceback
        traceback.print_exc()
        return False


def get_all_markets():
    """모든 행사 데이터 조회"""
    try:
        response = supabase.table("markets").select("*").execute()
        return response.data
    except Exception as e:
        print(f"❌ 데이터 조회 오류: {e}")
        return []


def get_market_sessions(market_id):
    """특정 행사의 모든 세션 조회"""
    try:
        response = supabase.table("sessions").select("*").eq("market_id", market_id).execute()
        return response.data
    except Exception as e:
        print(f"❌ 세션 조회 오류: {e}")
        return []
