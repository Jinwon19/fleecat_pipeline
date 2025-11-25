import json
import os
from openai import OpenAI
from dotenv import load_dotenv
import re
from prompt_templates import (
    get_text_prompt,
    get_image_prompt,
    get_refine_prompt,
)

# ✅ 환경 변수 로드
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("❌ OPENAI_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요!")

client = OpenAI(api_key=api_key)


# 🔹 공용 함수
def parse_json_output(raw_text):
    """AI 응답에서 JSON만 안전하게 파싱"""
    text = raw_text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*", "", text).strip("` \n")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def remove_mijeong_strings(data):
    """
    LLM이 "미정" 같은 플레이스홀더를 출력하면 빈 문자열로 치환
    프롬프트를 위반하는 경우를 대비한 안전장치
    """
    if not data:
        return data

    # 금지된 플레이스홀더 목록
    forbidden = ["미정", "추후 공지", "TBD", "미확정", "추가 예정", "추후 안내"]

    # place 필드 정제
    if data.get("place") in forbidden:
        data["place"] = ""
        print(f"  ⚠️  '미정' 문자열 제거: place 필드를 빈 문자열로 변환")

    # sessions 필드 정제
    for session in data.get("sessions", []):
        cleaned = False
        for key in ["start_date", "end_date", "start_time", "end_time", "notes"]:
            if session.get(key) in forbidden:
                session[key] = ""
                cleaned = True
        if cleaned:
            print(f"  ⚠️  '미정' 문자열 제거: sessions 필드를 빈 문자열로 변환")

    return data


# 🔹 이미지 분석
def extract_from_image(image_url, max_retries=3):
    if not image_url or not image_url.startswith("http"):
        return None

    prompt = get_image_prompt()

    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": image_url}},
                        ],
                    }
                ],
                temperature=0.2,
                max_tokens=800,
            )

            result = parse_json_output(response.choices[0].message.content)
            if result:
                print(f"✅ 이미지 분석 성공: {image_url[:50]}...")
                return result
        except Exception as e:
            print(f"❌ 이미지 분석 오류 (시도 {attempt+1}): {e}")

    print(f"⚠️ 이미지 분석 실패: {image_url}")
    return None


# 🔹 텍스트 기반 추출
def extract_fleamarket_info(raw_text, url, title, image_url=None, original_place="", post_date="", max_retries=3):
    prompt = get_text_prompt(raw_text, url, original_place, post_date)

    data = None
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",  # ✅ 비용 최적화
                messages=[
                    {"role": "system", "content": "너는 JSON 변환기 역할을 한다."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
            )

            data = parse_json_output(response.choices[0].message.content)
            if data:
                break
        except Exception as e:
            print(f"❌ 텍스트 분석 오류 (시도 {attempt+1}): {e}")

    if not data:
        print("❌ 텍스트 기반 JSON 변환 실패")
        return None

    # 🔹 필수 필드 보완
    data["url"] = url
    if not data.get("market_name"):
        data["market_name"] = title or "제목 미정"

    # 🔹 이미지 보완
    missing_info = (
        not data.get("place")
        or not data.get("sessions")
        or not data["sessions"][0].get("start_date")
    )

    if missing_info and image_url:
        print("⚠️ 텍스트 정보 부족 → 이미지 분석 보완 시도")
        img_data = extract_from_image(image_url)

        if img_data:
            place = img_data.get("place", "")
            date_info = img_data.get("date_info", "")
            time_info = img_data.get("time_info", "")
            if place:
                data["place"] = place

            # 🔄 재보정 프롬프트
            refine_prompt = get_refine_prompt(
                data.get("market_name", ""), data["place"], url, date_info, time_info
            )
            try:
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "너는 JSON 보정 전문가야."},
                        {"role": "user", "content": refine_prompt},
                    ],
                    temperature=0.2,
                )
                refined = parse_json_output(response.choices[0].message.content)
                if refined and refined.get("sessions"):
                    data["sessions"] = refined["sessions"]
                    print("✅ 이미지 정보로 세션 정보 보완 완료")
            except Exception as e:
                print(f"❌ 이미지 기반 보정 실패: {e}")

    # 🔹 기본값 채움 (빈 문자열 사용, "미정" 사용 금지)
    if not data.get("place"):
        data["place"] = ""  # "미정" 대신 빈 문자열
    if not data.get("sessions"):
        data["sessions"] = [
            {
                "start_date": "",
                "end_date": "",
                "start_time": "",
                "end_time": "",
                "notes": "",  # "날짜 미정" 대신 빈 문자열
            }
        ]

    # 🔹 안전장치: LLM이 "미정"을 출력한 경우 제거
    data = remove_mijeong_strings(data)

    return data


# 🔹 테스트 실행 예시
if __name__ == "__main__":
    sample_text = """
    [홍대 플리마켓]
    10월 25일~26일 오후 1시부터 6시까지
    홍대입구역 9번 출구 앞 광장
    다양한 수공예품과 음식이 함께합니다.
    """

    result = extract_fleamarket_info(
        raw_text=sample_text,
        url="https://example.com/post/123",
        title="홍대 플리마켓 행사",
        image_url="https://example.com/poster.jpg",
    )

    print(json.dumps(result, ensure_ascii=False, indent=2))
