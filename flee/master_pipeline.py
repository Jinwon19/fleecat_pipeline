"""
통합 마스터 파이프라인
크롤링 → LLM 정제 → 로컬 DB → Supabase 저장까지 전체 자동화
"""
import sys
import os
from datetime import datetime
import json
import logging
from pathlib import Path
from flea_list_fast import main as crawl_list


# 인코딩 설정 (안전하게 처리)
if sys.platform == "win32":
    import io
    # stdout이 이미 TextIOWrapper가 아니고 buffer가 있는 경우만 재설정
    if hasattr(sys.stdout, 'buffer') and not isinstance(sys.stdout, io.TextIOWrapper):
        try:
            # buffer가 유효한지 확인
            if sys.stdout.buffer and not sys.stdout.buffer.closed:
                sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        except (AttributeError, ValueError, OSError):
            # 실패 시 기존 stdout 유지
            pass

# 로그 폴더 생성
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

# 로깅 설정
log_filename = LOG_DIR / f"pipeline_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(log_filename, encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# 실행 통계 저장용
class PipelineStats:
    def __init__(self):
        self.start_time = None
        self.end_time = None
        self.steps = {
            'crawling': {'success': None, 'error': None, 'duration': None},
            'llm_processing': {'success': None, 'error': None, 'duration': None},
            'local_db': {'success': None, 'error': None, 'duration': None},
            'supabase': {'success': None, 'error': None, 'duration': None, 'success_count': 0, 'fail_count': 0}
        }

    def save_report(self, output_file="summary.txt"):
        """실행 리포트 저장"""
        with open(output_file, "w", encoding="utf-8") as f:
            f.write("=" * 80 + "\n")
            f.write("플리마켓 파이프라인 실행 리포트\n")
            f.write("=" * 80 + "\n\n")

            f.write(f"시작 시간: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"종료 시간: {self.end_time.strftime('%Y-%m-%d %H:%M:%S')}\n")

            duration = (self.end_time - self.start_time).total_seconds()
            f.write(f"총 소요 시간: {duration:.1f}초 ({duration/60:.1f}분)\n\n")

            f.write("-" * 80 + "\n")
            f.write("단계별 결과\n")
            f.write("-" * 80 + "\n\n")

            for step_name, step_data in self.steps.items():
                if step_data['success'] is not None:
                    status = "✅ 성공" if step_data['success'] else "❌ 실패"
                    f.write(f"[{step_name.upper()}] {status}\n")

                    if step_data['duration']:
                        f.write(f"  소요 시간: {step_data['duration']:.1f}초\n")

                    if step_data['error']:
                        f.write(f"  오류: {step_data['error']}\n")

                    if step_name == 'supabase' and step_data['success']:
                        f.write(f"  성공: {step_data['success_count']}개\n")
                        f.write(f"  실패: {step_data['fail_count']}개\n")

                    f.write("\n")

            f.write("=" * 80 + "\n")
            f.write(f"로그 파일: {log_filename}\n")
            f.write("=" * 80 + "\n")

stats = PipelineStats()


def print_header(title, char="="):
    """헤더 출력"""
    print()
    print(char * 80)
    print(f"  {title}")
    print(char * 80)
    print()


def print_step(step_num, title):
    """단계 출력"""
    print()
    print(f"{'='*80}")
    print(f"  STEP {step_num}: {title}")
    print(f"{'='*80}")
    print()


def run_crawling():
    """크롤링 실행"""
    print_step(1, "플리마켓 크롤링")
    step_start = datetime.now()

    try:
        from flea_list_fast import main as crawl_list
        from flea_text_fast import main as crawl_detail

        logger.info("게시물 목록 크롤링 시작")
        crawl_list()
        logger.info("목록 크롤링 완료")

        logger.info("상세 게시글 크롤링 시작")
        crawl_detail()
        logger.info("상세 크롤링 완료")

        duration = (datetime.now() - step_start).total_seconds()
        stats.steps['crawling']['success'] = True
        stats.steps['crawling']['duration'] = duration

        return True
    except Exception as e:
        logger.error(f"크롤링 실패: {e}", exc_info=True)

        duration = (datetime.now() - step_start).total_seconds()
        stats.steps['crawling']['success'] = False
        stats.steps['crawling']['error'] = str(e)
        stats.steps['crawling']['duration'] = duration

        return False


def run_llm_processing(force_update=False):
    """LLM 데이터 정제"""
    print_step(2, "LLM 데이터 정제")
    step_start = datetime.now()

    try:
        from extract_to_json import extract_to_json

        logger.info("LLM 정제 시작 (gpt-4o-mini)")
        result = extract_to_json("fleamarket_detail.json", force_update=force_update)

        duration = (datetime.now() - step_start).total_seconds()

        if result:
            logger.info("LLM 정제 완료")
            stats.steps['llm_processing']['success'] = True
            stats.steps['llm_processing']['duration'] = duration
            return True
        else:
            logger.error("LLM 정제 실패")
            stats.steps['llm_processing']['success'] = False
            stats.steps['llm_processing']['error'] = "extract_to_json returned None"
            stats.steps['llm_processing']['duration'] = duration
            return False

    except Exception as e:
        logger.error(f"LLM 정제 오류: {e}", exc_info=True)

        duration = (datetime.now() - step_start).total_seconds()
        stats.steps['llm_processing']['success'] = False
        stats.steps['llm_processing']['error'] = str(e)
        stats.steps['llm_processing']['duration'] = duration

        return False


def save_to_local_db():
    """로컬 SQLite DB 저장"""
    print_step(3, "로컬 DB 저장")
    step_start = datetime.now()

    try:
        from structured_to_db import structured_to_db

        logger.info("로컬 SQLite DB 저장 시작")
        structured_to_db("fleamarket_structured.json", skip_existing=False)
        logger.info("로컬 DB 저장 완료")

        duration = (datetime.now() - step_start).total_seconds()
        stats.steps['local_db']['success'] = True
        stats.steps['local_db']['duration'] = duration

        return True
    except Exception as e:
        logger.error(f"로컬 DB 저장 실패: {e}", exc_info=True)

        duration = (datetime.now() - step_start).total_seconds()
        stats.steps['local_db']['success'] = False
        stats.steps['local_db']['error'] = str(e)
        stats.steps['local_db']['duration'] = duration

        return False


def save_to_supabase():
    """Supabase 저장"""
    print_step(4, "Supabase 저장")
    step_start = datetime.now()

    try:
        from supabase_manager import save_to_db

        # structured.json 읽기
        with open("fleamarket_structured.json", "r", encoding="utf-8") as f:
            structured_data = json.load(f)

        logger.info(f"{len(structured_data)}개 데이터 Supabase 저장 시작")

        success_count = 0
        fail_count = 0

        for i, data in enumerate(structured_data, 1):
            market_name = data.get("market_name", "제목 미정")
            image_url = data.get("_source", {}).get("image_url", "")

            print(f"[{i}/{len(structured_data)}] {market_name[:50]}")

            if save_to_db(data, image_url):
                success_count += 1
            else:
                fail_count += 1

        print()
        print("-" * 80)
        logger.info(f"Supabase 저장 완료 - 성공: {success_count}개, 실패: {fail_count}개")
        print("-" * 80)

        duration = (datetime.now() - step_start).total_seconds()
        stats.steps['supabase']['success'] = success_count > 0
        stats.steps['supabase']['duration'] = duration
        stats.steps['supabase']['success_count'] = success_count
        stats.steps['supabase']['fail_count'] = fail_count

        return success_count > 0

    except FileNotFoundError:
        logger.error("fleamarket_structured.json 파일이 없습니다")

        duration = (datetime.now() - step_start).total_seconds()
        stats.steps['supabase']['success'] = False
        stats.steps['supabase']['error'] = "fleamarket_structured.json 파일이 없음"
        stats.steps['supabase']['duration'] = duration

        return False
    except Exception as e:
        logger.error(f"Supabase 저장 오류: {e}", exc_info=True)

        duration = (datetime.now() - step_start).total_seconds()
        stats.steps['supabase']['success'] = False
        stats.steps['supabase']['error'] = str(e)
        stats.steps['supabase']['duration'] = duration

        return False


def main(skip_crawling=False, skip_llm=False, force_update=False):
    """
    메인 파이프라인 실행

    Args:
        skip_crawling: 크롤링 단계 건너뛰기
        skip_llm: LLM 정제 단계 건너뛰기 (structured.json 재사용)
        force_update: 기존 데이터 덮어쓰기
    """
    stats.start_time = datetime.now()

    print_header("🚀 플리마켓 통합 파이프라인", "=")
    logger.info(f"파이프라인 시작 - 모드: {'전체 재처리' if force_update else '증분 업데이트'}")
    print(f"⏰ 시작 시간: {stats.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"📌 모드: {'전체 재처리' if force_update else '증분 업데이트'}")

    # Step 1: 크롤링
    if not skip_crawling:
        if not run_crawling():
            logger.error("크롤링 실패로 파이프라인 중단")
            print("\n❌ 크롤링 실패로 파이프라인 중단")
            stats.end_time = datetime.now()
            stats.save_report()
            return False
    else:
        print_step(1, "크롤링 건너뛰기")
        logger.info("크롤링 건너뛰기 - 기존 데이터 사용")
        print("⏭️  기존 크롤링 데이터 사용")

    # Step 2: LLM 정제
    if not skip_llm:
        if not run_llm_processing(force_update):
            logger.error("LLM 정제 실패로 파이프라인 중단")
            print("\n❌ LLM 정제 실패로 파이프라인 중단")
            stats.end_time = datetime.now()
            stats.save_report()
            return False
    else:
        print_step(2, "LLM 정제 건너뛰기")
        logger.info("LLM 정제 건너뛰기 - 기존 structured.json 사용")
        print("⏭️  기존 structured.json 사용")

    # Step 3: 로컬 DB 저장
    if not save_to_local_db():
        logger.warning("로컬 DB 저장 실패 (계속 진행)")
        print("\n⚠️  로컬 DB 저장 실패 (계속 진행)")

    # Step 4: Supabase 저장
    if not save_to_supabase():
        logger.error("Supabase 저장 실패")
        print("\n❌ Supabase 저장 실패")
        stats.end_time = datetime.now()
        stats.save_report()
        return False

    # 완료
    stats.end_time = datetime.now()
    duration = (stats.end_time - stats.start_time).total_seconds()

    # 리포트 저장
    stats.save_report()

    print_header("🎉 파이프라인 완료!", "=")
    logger.info(f"파이프라인 완료 - 소요 시간: {duration:.1f}초")
    print(f"⏰ 종료 시간: {stats.end_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"⏱️  소요 시간: {duration:.1f}초")
    print()
    print(f"📊 실행 리포트: summary.txt")
    print(f"📋 로그 파일: {log_filename}")
    print()

    return True


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="플리마켓 통합 파이프라인")
    parser.add_argument("--skip-crawling", action="store_true", help="크롤링 단계 건너뛰기")
    parser.add_argument("--skip-llm", action="store_true", help="LLM 정제 단계 건너뛰기")
    parser.add_argument("--force", "-f", action="store_true", help="전체 재처리 모드")

    args = parser.parse_args()

    success = main(
        skip_crawling=args.skip_crawling,
        skip_llm=args.skip_llm,
        force_update=args.force
    )

    sys.exit(0 if success else 1)
