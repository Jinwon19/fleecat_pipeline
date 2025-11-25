import sqlite3

DB_PATH = "fleamarket.db"


def get_connection():
    """DB 연결 반환"""
    return sqlite3.connect(DB_PATH)


def init_db():
    """테이블 생성 (최초 1회만 실행되지만 save_to_db 안에서 보장됨)"""
    conn = get_connection()
    cur = conn.cursor()

    # markets 테이블
    cur.execute("""
        CREATE TABLE IF NOT EXISTS markets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            market_name TEXT,
            place TEXT,
            url TEXT UNIQUE,
            image_url TEXT
        )
    """)

    # sessions 테이블
    cur.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            market_id INTEGER,
            start_date TEXT,
            end_date TEXT,
            start_time TEXT,
            end_time TEXT,
            notes TEXT,
            UNIQUE(market_id, start_date, end_date, start_time, end_time, notes),
            FOREIGN KEY(market_id) REFERENCES markets(id)
        )
    """)

    conn.commit()
    conn.close()


def is_url_exist(url: str) -> bool:
    """해당 url이 markets 테이블에 이미 존재하는지 확인"""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM markets WHERE url = ?", (url,))
    result = cur.fetchone()
    conn.close()
    return result is not None


def save_to_db(data, image_url=None):
    """플리마켓 데이터 저장 (markets + sessions)"""
    if not data.get("url"):
        print("❌ URL 없음 → 저장 안 함")
        return

    conn = get_connection()
    cur = conn.cursor()

    # 테이블 보장
    init_db()

    # 1) markets 중복 확인
    cur.execute("SELECT id FROM markets WHERE url = ?", (data["url"],))
    row = cur.fetchone()

    if row:
        market_id = row[0]
    else:
        cur.execute(
            "INSERT INTO markets (market_name, place, url, image_url) VALUES (?, ?, ?, ?)",
            (data.get("market_name", "제목 미정"), data.get("place", "미정"), data["url"], image_url or "")
        )
        market_id = cur.lastrowid

    # 2) sessions 저장 (중복 방지)
    for session in data.get("sessions", []):
        try:
            cur.execute("""
                INSERT OR IGNORE INTO sessions 
                (market_id, start_date, end_date, start_time, end_time, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                market_id,
                session.get("start_date", ""),
                session.get("end_date", ""),
                session.get("start_time", ""),
                session.get("end_time", ""),
                session.get("notes", "")
            ))
        except Exception as e:
            print(f"❌ 세션 저장 오류: {e}")

    conn.commit()
    conn.close()
    print(f"✅ {data.get('market_name', '제목 미정')} 저장 완료 (중복 방지 적용)")
