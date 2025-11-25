"""
플리마켓 상세 게시글 크롤링 (병렬 처리 고속 버전)
- requests 우선 시도 (빠름)
- 실패시 Selenium Headless로 자동 전환
"""
import requests
from bs4 import BeautifulSoup
import json
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm
import time
import sys

# Windows 인코딩 문제 해결
if sys.platform == "win32":
    import io
    try:
        if hasattr(sys.stdout, 'buffer') and sys.stdout.buffer:
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    except (AttributeError, ValueError):
        pass  # subprocess로 실행될 때는 스킵

# ==================== 설정 ====================
POSTS_FILE = "fleamarket_posts.json"
OUTPUT_FILE = "fleamarket_detail.json"
MAX_WORKERS = 10  # 동시 처리 페이지 수 (상세페이지는 더 많이 가능)
RETRY_ATTEMPTS = 3

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
}


# ==================== requests 방식 ====================
def fetch_detail_requests(link):
    """requests로 상세 페이지 크롤링"""
    
    for attempt in range(RETRY_ATTEMPTS):
        try:
            response = requests.get(link, headers=HEADERS, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 게시글 본문 찾기 (전체 HTML 확보)
            content_elem = soup.select_one('.fr-element.fr-view')
            if not content_elem:
                # 다른 가능한 선택자들 시도
                content_elem = soup.select_one('.content') or soup.select_one('.post-content') or soup.select_one('article')

            if not content_elem:
                return None  # 콘텐츠 없으면 실패

            # get_text()를 사용하여 전체 텍스트 추출 (200자 제한 방지)
            content_text = content_elem.get_text(strip=False, separator='\n')

            # 텍스트 길이 확인 (디버깅용)
            if len(content_text) < 250:
                # 200자 미만이면 Selenium으로 재시도하는 것이 나을 수 있음
                # 하지만 여기서는 일단 진행
                pass
            
            # 제목 추출
            title_elem = soup.select_one('title') or soup.select_one('h1')
            title = title_elem.text.strip() if title_elem else ""
            
            # 정규식으로 정보 추출
            market_name = re.search(r"프리마켓명\s*[:：]\s*(.*)", content_text)
            date_time = re.search(r"날짜.*[:：]\s*(.*)", content_text)
            place = re.search(r"장소\s*[:：]\s*(.*)", content_text)
            
            # 이미지 URL 추출 (본문 첫 이미지)
            img_elem = content_elem.select_one('img')
            image_url = img_elem['src'] if img_elem and img_elem.get('src') else ""

            # 게시글 작성일 추출 (연도 추론에 사용)
            post_date_elem = soup.select_one('.tpl-forum-date') or soup.select_one('.date')
            post_date = ""
            if post_date_elem:
                post_date_text = post_date_elem.get_text(strip=True)
                # "2025. 10. 2" 형식에서 날짜 추출
                date_match = re.search(r'(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})', post_date_text)
                if date_match:
                    year, month, day = date_match.groups()
                    post_date = f"{year}-{month.zfill(2)}-{day.zfill(2)}"

            result = {
                "url": link,
                "title": title,
                "market_name": market_name.group(1).strip() if market_name else "",
                "date_time": date_time.group(1).strip() if date_time else "",
                "place": place.group(1).strip() if place else "",
                "raw_text": content_text.strip(),
                "image_url": image_url,
                "post_date": post_date
            }
            
            return result
            
        except Exception as e:
            if attempt == RETRY_ATTEMPTS - 1:
                # print(f"❌ {link} 요청 실패: {e}")
                return None
            time.sleep(1)
    
    return None


# ==================== Selenium 방식 (백업) ====================
def fetch_detail_selenium(link):
    """Selenium Headless로 상세 페이지 크롤링"""
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.common.by import By
    
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument(f'user-agent={HEADERS["User-Agent"]}')
    
    try:
        service = Service(r"C:\Users\yg-603-20\Desktop\연습 프로젝트\플리마켓\flee\chromedriver.exe")
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        driver.get(link)
        time.sleep(5)  # 동적 콘텐츠 로딩 대기 (2초 → 5초로 증가)

        # 페이지 하단까지 스크롤하여 전체 컨텐츠 로드
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(3)  # 추가 컨텐츠 로드 대기 (1초 → 3초로 증가)

        # 게시글 본문 (전체 HTML 가져오기)
        try:
            content_elem = driver.find_element(By.CSS_SELECTOR, '.fr-element.fr-view')
            # .text 대신 innerHTML 가져와서 전체 내용 확보
            content_html = content_elem.get_attribute('innerHTML')
            soup = BeautifulSoup(content_html, 'html.parser')
            content_text = soup.get_text(strip=False, separator='\n')
        except:
            try:
                content_elem = driver.find_element(By.CSS_SELECTOR, '.content')
                content_html = content_elem.get_attribute('innerHTML')
                soup = BeautifulSoup(content_html, 'html.parser')
                content_text = soup.get_text(strip=False, separator='\n')
            except:
                driver.quit()
                return None
        
        # 정규식으로 정보 추출
        market_name = re.search(r"프리마켓명\s*[:：]\s*(.*)", content_text)
        date_time = re.search(r"날짜.*[:：]\s*(.*)", content_text)
        place = re.search(r"장소\s*[:：]\s*(.*)", content_text)

        # 게시글 작성일 추출 (연도 추론에 사용)
        post_date = ""
        try:
            # .tpl-forum-date 또는 .date 선택자로 작성일 찾기
            post_date_elem = driver.find_element(By.CSS_SELECTOR, '.tpl-forum-date') if driver.find_elements(By.CSS_SELECTOR, '.tpl-forum-date') else None
            if not post_date_elem:
                post_date_elem = driver.find_element(By.CSS_SELECTOR, '.date') if driver.find_elements(By.CSS_SELECTOR, '.date') else None

            if post_date_elem:
                post_date_text = post_date_elem.text.strip()
                # "2025. 10. 2" 형식에서 날짜 추출
                date_match = re.search(r'(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})', post_date_text)
                if date_match:
                    year, month, day = date_match.groups()
                    post_date = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
        except:
            pass  # 작성일을 찾을 수 없으면 빈 문자열

        result = {
            "url": link,
            "title": driver.title,
            "market_name": market_name.group(1).strip() if market_name else "",
            "date_time": date_time.group(1).strip() if date_time else "",
            "place": place.group(1).strip() if place else "",
            "raw_text": content_text.strip(),
            "image_url": "",
            "post_date": post_date
        }
        
        driver.quit()
        return result
        
    except Exception as e:
        # print(f"❌ Selenium {link} 실패: {e}")
        try:
            driver.quit()
        except:
            pass
        return None


# ==================== 메인 로직 ====================
def crawl_all_details():
    """병렬로 모든 상세 페이지 크롤링"""

    # posts 파일 확인
    if not os.path.exists(POSTS_FILE):
        print(f"❌ {POSTS_FILE} 파일이 없습니다. 먼저 flea_list_fast.py를 실행하세요.")
        return

    with open(POSTS_FILE, "r", encoding="utf-8") as f:
        posts = json.load(f)

    print(f"📂 {len(posts)}개 게시물 로드")

    # 기존 상세 데이터 로드
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            existing_details = json.load(f)
        existing_urls = {d["url"] for d in existing_details}
        print(f"📂 기존 상세 데이터 {len(existing_details)}개 로드")
    else:
        existing_details = []
        existing_urls = set()

    # 크롤링할 링크 필터링 (이미 있는 것 제외)
    links_to_crawl = [p["link"] for p in posts if p["link"] not in existing_urls]

    if not links_to_crawl:
        print("✅ 모든 게시물이 이미 크롤링되었습니다.")
        return

    print(f"🎯 크롤링 대상: {len(links_to_crawl)}개")

    # 첫 링크로 requests 테스트
    print("🔍 requests 방식 테스트 중...")
    test_result = fetch_detail_requests(links_to_crawl[0])

    # 결과가 None이거나 텍스트 길이가 500자 미만이면 Selenium 사용
    if test_result is None:
        print("⚠️ requests 실패 (결과 없음) → Selenium Headless로 전환")
        use_selenium = True
    elif len(test_result.get("raw_text", "")) < 500:
        print(f"⚠️ requests로 불완전한 데이터 수집 (텍스트 {len(test_result.get('raw_text', ''))}자) → Selenium Headless로 전환")
        use_selenium = True
    else:
        print(f"✅ requests 성공! (텍스트 {len(test_result.get('raw_text', ''))}자)")
        use_selenium = False

    # 병렬 크롤링
    all_new_details = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        if use_selenium:
            futures = {executor.submit(fetch_detail_selenium, link): link for link in links_to_crawl}
        else:
            futures = {executor.submit(fetch_detail_requests, link): link for link in links_to_crawl}

        print(f"\n🚀 {len(links_to_crawl)}개 상세 페이지 병렬 크롤링 시작 (동시 {MAX_WORKERS}개)")

        for future in tqdm(as_completed(futures), total=len(futures), desc="크롤링 진행"):
            link = futures[future]
            try:
                detail = future.result()
                if detail:
                    all_new_details.append(detail)
            except Exception as e:
                print(f"❌ {link} 처리 오류: {e}")

    # 결과 저장
    all_details = existing_details + all_new_details

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_details, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 크롤링 완료!")
    print(f"   총 상세 데이터: {len(all_details)}개")
    print(f"   신규 추가: {len(all_new_details)}개")
    print(f"   저장 위치: {OUTPUT_FILE}")


def main():
    """메인 함수 - master_pipeline에서 호출"""
    return crawl_all_details()


if __name__ == "__main__":
    main()

