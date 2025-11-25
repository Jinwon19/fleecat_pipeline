"""
SQLite → Supabase 데이터 마이그레이션
"""
import json
import sys
import io

# Windows 인코딩 처리 (직접 실행시)
try:
    if sys.platform == "win32" and hasattr(sys.stdout, 'buffer'):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
except:
    pass

from supabase_manager import save_to_db


def migrate_from_sqlite():
    """SQLite DB → Supabase 마이그레이션"""
    
    print("=" * 80)
    print("🔄 SQLite → Supabase 데이터 마이그레이션")
    print("=" * 80)
    print()
    
    import sqlite3
    
    try:
        # SQLite 연결
        conn = sqlite3.connect("fleamarket.db")
        cur = conn.cursor()
        
        # 전체 데이터 조회
        cur.execute("""
            SELECT m.id, m.market_name, m.place, m.url, m.image_url
            FROM markets m
        """)
        markets = cur.fetchall()
        
        print(f"📊 SQLite에서 {len(markets)}개 행사 발견")
        print()
        
        success_count = 0
        fail_count = 0
        
        for market in markets:
            market_id, market_name, place, url, image_url = market
            
            print(f"[{success_count + fail_count + 1}/{len(markets)}] {market_name[:40]}")
            
            # sessions 조회
            cur.execute("""
                SELECT start_date, end_date, start_time, end_time, notes
                FROM sessions
                WHERE market_id = ?
            """, (market_id,))
            sessions_data = cur.fetchall()
            
            # structured 형식으로 변환
            structured = {
                "market_name": market_name,
                "place": place,
                "url": url,
                "sessions": [
                    {
                        "start_date": s[0],
                        "end_date": s[1],
                        "start_time": s[2],
                        "end_time": s[3],
                        "notes": s[4]
                    }
                    for s in sessions_data
                ]
            }
            
            # Supabase에 저장
            if save_to_db(structured, image_url):
                success_count += 1
            else:
                fail_count += 1
            
            print()
        
        conn.close()
        
        print("=" * 80)
        print(f"✅ 마이그레이션 완료")
        print(f"   성공: {success_count}개")
        print(f"   실패: {fail_count}개")
        print("=" * 80)
        
    except Exception as e:
        print(f"❌ 마이그레이션 오류: {e}")
        import traceback
        traceback.print_exc()


def migrate_from_structured():
    """fleamarket_structured.json → Supabase 마이그레이션 (더 빠름)"""
    
    print("=" * 80)
    print("🔄 structured.json → Supabase 데이터 마이그레이션")
    print("=" * 80)
    print()
    
    try:
        with open("fleamarket_structured.json", "r", encoding="utf-8") as f:
            structured_data = json.load(f)
        
        print(f"📊 {len(structured_data)}개 행사 발견")
        print()
        
        success_count = 0
        fail_count = 0
        
        for i, data in enumerate(structured_data, 1):
            market_name = data.get("market_name", "제목 미정")
            print(f"[{i}/{len(structured_data)}] {market_name[:40]}")
            
            # 이미지 URL 추출
            image_url = data.get("_source", {}).get("image_url", "")
            
            # Supabase에 저장
            if save_to_db(data, image_url):
                success_count += 1
            else:
                fail_count += 1
        
        print()
        print("=" * 80)
        print(f"✅ 마이그레이션 완료")
        print(f"   성공: {success_count}개")
        print(f"   실패: {fail_count}개")
        print("=" * 80)
        
    except FileNotFoundError:
        print("❌ fleamarket_structured.json 파일이 없습니다.")
    except Exception as e:
        print(f"❌ 마이그레이션 오류: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    import sys
    
    if "--sqlite" in sys.argv:
        print("📌 SQLite DB에서 마이그레이션\n")
        migrate_from_sqlite()
    else:
        print("📌 structured.json에서 마이그레이션 (권장)\n")
        migrate_from_structured()

