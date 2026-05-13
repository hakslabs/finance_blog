# Finance_lab

Finance_lab은 초보 개인 투자자를 위한 주식 투자 학습 및 관리 대시보드입니다. 관심종목, 포트폴리오, 시장 지표, 경제 이벤트 캘린더, 종목 분석, 13F 기반 고수 포트폴리오, 증권사 리포트, 재무제표 학습 콘텐츠를 한곳에서 확인하는 것을 목표로 합니다.

현재 구현 기준은 `design/` 폴더의 STOCKLAB 와이어프레임입니다. 실제 제품명은 Finance_lab으로 사용합니다.

## 설치

아직 앱 런타임은 초기화되지 않았습니다. 예정 스택은 다음과 같습니다.

- Frontend: React
- Backend: FastAPI
- Database/Auth: Supabase
- Deployment: Vercel
- Future hosting: personal NAS or self-hosted server/database

## 실행

현재 단계에서는 디자인 스켈레톤을 먼저 확인합니다.

```bash
open "design/STOCKLAB Wireframes v3.html"
```

React/FastAPI 앱이 생성되면 이 섹션에 실제 실행 명령을 추가합니다.

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
