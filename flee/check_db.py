"""
SQLite DB 내용 확인 스크립트
"""
import sqlite3
import sys
import io

# Windows 인코딩 문제 해결
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, 'buffer') and sys.stdout.buffer:
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    except (AttributeError, ValueError):
        pass  # subprocess로 실행될 때는 스킵

DB_PATH = "fleamarket.db"

def check_db():
    """DB 내용 확인"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        
        print("=" * 80)
        print("📊 플리마켓 DB 내용 확인")
        print("=" * 80)
        print()
        
        # 1. markets 테이블 확인
        print("📋 [1] MARKETS 테이블 (행사 정보)")
        print("-" * 80)
        cur.execute("SELECT COUNT(*) FROM markets")
        count = cur.fetchone()[0]
        print(f"총 행사 수: {count}개\n")
        
        if count > 0:
            cur.execute("""
                SELECT id, market_name, place, url, image_url 
                FROM markets 
                LIMIT 5
            """)
            rows = cur.fetchall()
            
            for i, row in enumerate(rows, 1):
                print(f"[{i}] ID: {row[0]}")
                print(f"    행사명: {row[1]}")
                print(f"    장소: {row[2]}")
                print(f"    URL: {row[3]}")
                print(f"    이미지: {row[4][:50]}..." if row[4] else "    이미지: 없음")
                print()
            
            if count > 5:
                print(f"... 외 {count - 5}개 더 있음\n")
        else:
            print("⚠️  데이터가 없습니다.\n")
        
        # 2. sessions 테이블 확인
        print("-" * 80)
        print("📅 [2] SESSIONS 테이블 (일정 정보)")
        print("-" * 80)
        cur.execute("SELECT COUNT(*) FROM sessions")
        count = cur.fetchone()[0]
        print(f"총 일정 수: {count}개\n")
        
        if count > 0:
            cur.execute("""
                SELECT s.id, m.market_name, s.start_date, s.end_date, 
                       s.start_time, s.end_time, s.notes
                FROM sessions s
                JOIN markets m ON s.market_id = m.id
                LIMIT 5
            """)
            rows = cur.fetchall()
            
            for i, row in enumerate(rows, 1):
                print(f"[{i}] 일정 ID: {row[0]}")
                print(f"    행사명: {row[1]}")
                print(f"    날짜: {row[2]} ~ {row[3]}")
                print(f"    시간: {row[4]} ~ {row[5]}")
                print(f"    비고: {row[6]}")
                print()
            
            if count > 5:
                print(f"... 외 {count - 5}개 더 있음\n")
        else:
            print("⚠️  데이터가 없습니다.\n")
        
        # 3. 테이블 구조 확인
        print("-" * 80)
        print("🔧 [3] 테이블 구조")
        print("-" * 80)
        
        print("\n📋 MARKETS 테이블 구조:")
        cur.execute("PRAGMA table_info(markets)")
        for col in cur.fetchall():
            print(f"  - {col[1]} ({col[2]})")
        
        print("\n📅 SESSIONS 테이블 구조:")
        cur.execute("PRAGMA table_info(sessions)")
        for col in cur.fetchall():
            print(f"  - {col[1]} ({col[2]})")
        
        print("\n" + "=" * 80)
        print("✅ DB 확인 완료")
        print("=" * 80)
        
        conn.close()
        
    except sqlite3.Error as e:
        print(f"❌ DB 오류: {e}")
    except FileNotFoundError:
        print(f"❌ {DB_PATH} 파일이 없습니다.")
        print("   먼저 크롤링을 실행하세요: python scheduler_fast.py")

if __name__ == "__main__":
    check_db()

