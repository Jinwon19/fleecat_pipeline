"""
플리마켓 게시물 목록 크롤링 (병렬 처리 고속 버전)
- requests 우선 시도 (빠름)
- 실패시 Selenium Headless로 자동 전환
"""
import requests
from bs4 import BeautifulSoup
import json
import os
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
BASE_URL = "https://xn--oy2b2b112gxof.com/"
OUTPUT_FILE = "fleamarket_posts.json"
MAX_WORKERS = 5  # 동시 처리 페이지 수
MAX_PAGES = 10   # 크롤링할 최대 페이지 수 (필요시 수정)
RETRY_ATTEMPTS = 3

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
}


# ==================== requests 방식 ====================
def fetch_page_requests(page_num):
    """requests로 특정 페이지 크롤링"""
    url = f"{BASE_URL}?page={page_num}" if page_num > 1 else BASE_URL
    
    for attempt in range(RETRY_ATTEMPTS):
        try:
            response = requests.get(url, headers=HEADERS, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            cards = soup.select('.col-xs-6.col-sm-3.col-md-3.item')
            
            if not cards:
                return None  # 카드 없으면 실패
            
            posts = []
            for card in cards:
                try:
                    title_elem = card.select_one('.tpl-forum-list-title')
                    img_elem = card.select_one('img')
                    link_elem = card.select_one('a')
                    
                    if title_elem and link_elem:
                        posts.append({
                            "title": title_elem.text.strip(),
                            "image_url": img_elem['src'] if img_elem and img_elem.get('src') else "",
                            "link": link_elem['href']
                        })
                except Exception as e:
                    continue
            
            return posts
            
        except Exception as e:
            if attempt == RETRY_ATTEMPTS - 1:
                print(f"❌ 페이지 {page_num} 요청 실패 (재시도 {attempt+1}/{RETRY_ATTEMPTS}): {e}")
                return None
            time.sleep(1)
    
    return None


# ==================== Selenium 방식 (백업) ====================
def fetch_page_selenium(page_num):
    """Selenium Headless로 특정 페이지 크롤링"""
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.common.by import By
    
    chrome_options = Options()
    chrome_options.add_argument('--headless')  # 창 안 띄움
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument(f'user-agent={HEADERS["User-Agent"]}')
    
    try:
        # chromedriver 경로 (현재 디렉토리)
        service = Service(r"C:\Users\yg-603-20\Desktop\연습 프로젝트\플리마켓\flee\chromedriver.exe")
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        url = BASE_URL
        driver.get(url)
        time.sleep(2)
        
        # 페이지 이동 (2페이지 이상)
        if page_num > 1:
            for _ in range(page_num - 1):
                try:
                    next_btn = driver.find_element(By.LINK_TEXT, str(_ + 2))
                    next_btn.click()
                    time.sleep(2)
                except:
                    driver.quit()
                    return None
        
        # 카드 수집
        cards = driver.find_elements(By.CSS_SELECTOR, '.col-xs-6.col-sm-3.col-md-3.item')
        
        posts = []
        for card in cards:
            try:
                title = card.find_element(By.CSS_SELECTOR, '.tpl-forum-list-title').text.strip()
                img = card.find_element(By.CSS_SELECTOR, 'img').get_attribute('src')
                link = card.find_element(By.CSS_SELECTOR, 'a').get_attribute('href')
                
                posts.append({
                    "title": title,
                    "image_url": img or "",
                    "link": link
                })
            except:
                continue
        
        driver.quit()
        return posts
        
    except Exception as e:
        print(f"❌ Selenium 페이지 {page_num} 실패: {e}")
        try:
            driver.quit()
        except:
            pass
        return None


# ==================== 메인 로직 ====================
def crawl_all_pages():
    """병렬로 모든 페이지 크롤링"""

    # 기존 데이터 로드
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            existing_posts = json.load(f)
        existing_links = {p["link"] for p in existing_posts}
        print(f"📂 기존 게시물 {len(existing_posts)}개 로드")
    else:
        existing_posts = []
        existing_links = set()

    # 첫 페이지로 requests 테스트
    print("🔍 requests 방식 테스트 중...")
    test_result = fetch_page_requests(1)

    if test_result is None:
        print("⚠️ requests 실패 → Selenium Headless로 전환")
        use_selenium = True
    else:
        print(f"✅ requests 성공! ({len(test_result)}개 카드 발견)")
        use_selenium = False

    # 병렬 크롤링
    all_new_posts = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        if use_selenium:
            futures = {executor.submit(fetch_page_selenium, page): page for page in range(1, MAX_PAGES + 1)}
        else:
            futures = {executor.submit(fetch_page_requests, page): page for page in range(1, MAX_PAGES + 1)}

        print(f"\n🚀 {MAX_PAGES}개 페이지 병렬 크롤링 시작 (동시 {MAX_WORKERS}개)")

        for future in tqdm(as_completed(futures), total=len(futures), desc="크롤링 진행"):
            page_num = futures[future]
            try:
                posts = future.result()
                if posts:
                    # 중복 제거
                    new_posts = [p for p in posts if p["link"] not in existing_links]
                    all_new_posts.extend(new_posts)
                    existing_links.update(p["link"] for p in new_posts)
                    # print(f"✅ 페이지 {page_num}: {len(new_posts)}개 신규")
            except Exception as e:
                print(f"❌ 페이지 {page_num} 처리 오류: {e}")

    # 결과 저장
    all_posts = existing_posts + all_new_posts

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_posts, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 크롤링 완료!")
    print(f"   총 게시물: {len(all_posts)}개")
    print(f"   신규 추가: {len(all_new_posts)}개")
    print(f"   저장 위치: {OUTPUT_FILE}")


def main():
    """메인 함수 - master_pipeline에서 호출"""
    return crawl_all_pages()


if __name__ == "__main__":
    main()

