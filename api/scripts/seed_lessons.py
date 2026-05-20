"""One-shot seed for learn_chapters + learn_lessons (mig 0024).

Usage:
    cd api && .venv/bin/python scripts/seed_lessons.py

Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the env (.env). Idempotent
(uses upsert via resolution=merge-duplicates). Intended for development seed;
production lessons should be authored by editors.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

SB_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SB_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SB_URL or not SB_KEY:
    sys.stderr.write("missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY\n")
    sys.exit(2)


CHAPTERS = [
    {"id": "basics", "title": "투자 기초", "description": "주식·시장 작동 원리", "category": "기초", "position": 0},
    {"id": "technical", "title": "기술적 분석", "description": "차트와 지표", "category": "기술적분석", "position": 1},
    {"id": "value", "title": "가치투자", "description": "버핏의 원칙", "category": "가치투자", "position": 2},
    {"id": "macro", "title": "매크로", "description": "금리·경기·환율", "category": "매크로", "position": 3},
    {"id": "quant", "title": "퀀트", "description": "팩터 투자와 백테스팅", "category": "퀀트", "position": 4},
]


LESSONS = [
    # basics
    {"id": "basics-intro", "chapter_id": "basics", "title": "주식 투자 시작하기",
     "description": "처음 주식을 시작하는 분들을 위한 입문서",
     "level": "입문", "read_time": 8, "position": 0, "is_popular": True,
     "tags": ["기초", "입문"],
     "content": "# 주식 투자란?\n\n주식은 기업의 소유권 일부를 나타내는 증서입니다…",
     "quiz": [{"q": "주식은 무엇을 의미하는가?", "options": ["채권", "기업의 소유권 일부", "예금"], "answer_idx": 1}]},
    {"id": "basics-financials", "chapter_id": "basics", "title": "재무제표 읽는 법",
     "description": "손익계산서·재무상태표·현금흐름표 핵심 정리",
     "level": "초급", "read_time": 12, "position": 1, "is_popular": False,
     "tags": ["기초", "재무"],
     "content": "# 재무제표\n\n주요 재무제표는 3가지로 분류됩니다…"},
    {"id": "basics-per-pbr", "chapter_id": "basics", "title": "PER·PBR·ROE 이해하기",
     "description": "가장 자주 쓰이는 3대 밸류에이션 지표",
     "level": "초급", "read_time": 10, "position": 2,
     "tags": ["기초", "밸류에이션"],
     "content": "# PER\n\nPrice / Earnings…"},

    # technical
    {"id": "technical-ma", "chapter_id": "technical", "title": "이동평균선 (MA)",
     "description": "20일·60일·120일선의 의미와 활용",
     "level": "초급", "read_time": 7, "position": 0, "is_popular": True,
     "tags": ["기술적", "MA"],
     "content": "# 이동평균선\n\nMA(Moving Average)는 N일 동안의 종가 평균…"},
    {"id": "technical-rsi", "chapter_id": "technical", "title": "RSI 지표 활용",
     "description": "상대강도지수로 과매수·과매도 판단",
     "level": "초급", "read_time": 6, "position": 1,
     "tags": ["기술적", "RSI"],
     "content": "# RSI\n\nRSI는 0-100 사이 값으로 70 이상이면 과매수…"},

    # value
    {"id": "value-buffett", "chapter_id": "value", "title": "버핏의 5가지 투자 원칙",
     "description": "오마하의 현인이 강조한 핵심 원칙",
     "level": "중급", "read_time": 15, "position": 0, "is_popular": True,
     "tags": ["가치", "버핏"],
     "content": "# 버핏의 원칙\n\n1. 절대 잃지 말 것…"},
    {"id": "value-moat", "chapter_id": "value", "title": "경제적 해자 (Moat)",
     "description": "지속 가능한 경쟁우위 분석",
     "level": "중급", "read_time": 11, "position": 1,
     "tags": ["가치", "moat"],
     "content": "# 경제적 해자\n\n해자는 경쟁자로부터 기업을 지키는 구조적 우위…"},

    # macro
    {"id": "macro-rates", "chapter_id": "macro", "title": "금리와 주식의 관계",
     "description": "Fed 결정이 자산 가격에 미치는 영향",
     "level": "중급", "read_time": 9, "position": 0,
     "tags": ["매크로", "금리"],
     "content": "# 금리·주식\n\n금리가 오르면 미래 현금흐름의 할인율이 커져…"},

    # quant
    {"id": "quant-factor", "chapter_id": "quant", "title": "팩터 투자 입문",
     "description": "Value/Momentum/Quality/Low-Vol 5팩터",
     "level": "고급", "read_time": 14, "position": 0,
     "tags": ["퀀트", "factor"],
     "content": "# 팩터 투자\n\n학계는 장기적으로 초과수익을 내는 ‘팩터’를…"},
]


def upsert(table: str, rows: list[dict]) -> int:
    if not rows:
        return 0
    headers = {
        "apikey": SB_KEY,
        "Authorization": f"Bearer {SB_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    r = httpx.post(f"{SB_URL}/rest/v1/{table}", json=rows, headers=headers, timeout=30.0)
    if r.status_code >= 400:
        sys.stderr.write(f"{table}: {r.status_code} {r.text[:200]}\n")
        return 0
    return len(rows)


def main() -> None:
    nc = upsert("learn_chapters", CHAPTERS)
    nl = upsert("learn_lessons", LESSONS)
    print(f"chapters upserted: {nc}/{len(CHAPTERS)}")
    print(f"lessons  upserted: {nl}/{len(LESSONS)}")


if __name__ == "__main__":
    main()
