# Finance_lab

Finance_lab은 초보 개인 투자자를 위한 주식 투자 학습 및 관리 대시보드입니다. 관심종목, 포트폴리오, 시장 지표, 경제 이벤트 캘린더, 종목 분석, 13F 기반 고수 포트폴리오, 증권사 리포트, 재무제표 학습 콘텐츠를 한곳에서 확인하는 것을 목표로 합니다.

현재 구현 기준은 `design/` 폴더의 STOCKLAB 와이어프레임입니다. 실제 제품명은 Finance_lab으로 사용합니다.

## 스택

풀스택 앱이 구현되어 실데이터를 화면에 출력합니다.

- Frontend: React 19 + Vite + Tailwind (`web/`)
- Backend: FastAPI (`api/`), 외부 소스 = Polygon · Alpha Vantage · Finnhub · FRED · ECOS · KRX · DART · SEC EDGAR · CNN F&G
- Database/Auth: Supabase (Postgres + RLS + JWT)
- Deployment: Vercel (단일 프로젝트, `api/index.py`가 ASGI 재노출)

## 빠른 실행 (원커맨드)

```bash
cp .env.example .env       # 최초 1회 — API 키를 채워 넣습니다
npm install                # 루트 dev 도구
npm --prefix web install   # 프론트 의존성
npm run dev                # API + 웹을 함께 기동
```

`npm run dev`(= `scripts/dev.sh`)는 FastAPI와 Vite를 동시에 띄우고, **`:8000`이 사용 중이면 `:8010`처럼 빈 포트를 자동 선택**한 뒤 프론트의 `/api` 프록시를 거기에 연결합니다. 기동 후 <http://127.0.0.1:3000> 접속.

- 웹: <http://127.0.0.1:3000> (전 페이지 + `/terminal` 고밀도 터미널)
- API: 위 명령이 출력하는 포트(기본 `:8000`, 충돌 시 `:8010`)
- 포트 강제 지정: `API_PORT=8010 WEB_PORT=3000 npm run dev`

개별 기동이 필요하면:

```bash
# 백엔드만 (api/는 repo 루트 .env를 자동 로드)
cd api && uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
# 프론트만 (API가 8000이 아니면 VITE_PROXY_TARGET 지정)
cd web && VITE_PROXY_TARGET=http://127.0.0.1:8010 npm run dev
```

## 검증 (전체 게이트)

```bash
npm run lint            # markdownlint(docs) + web tsc --noEmit
npm run format:check    # prettier 검사
npm --prefix web run build   # 프로덕션 번들
npm run test:charts     # Playwright 차트 스모크 (dev 서버가 떠 있어야 함)
```

## 사용 방식

1. `design/`의 와이어프레임을 기준으로 프론트 화면을 구성합니다.
2. FastAPI 백엔드와 Supabase DB를 연결합니다.
3. 화면에 필요한 내부 데이터 파이프라인과 API 응답 구조를 먼저 구성합니다.
4. 실제 주식/경제 데이터를 화면에 출력합니다.
5. 이후 데이터 수집 파이프라인을 작성합니다.
6. Cron 같은 자동 수집은 마지막 단계에서 추가합니다.

## Generated Structure

- `AGENTS.md`: 에이전트가 먼저 읽을 문서 지도
- `ARCHITECTURE.md`: 저장소 구조와 경계
- `docs/product-specs/`: 제품 요구사항
- `docs/design-docs/`: 설계 원칙과 디자인 기준
- `docs/exec-plans/`: 실행 계획과 기술 부채
- `docs/references/`: 에이전트용 빠른 참고 문서
- `scripts/init.sh`: 기본 디렉터리 초기화 스크립트
