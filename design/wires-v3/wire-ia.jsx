// IA / Sitemap v2 — Korean menu labels, heatmap absorbed into Home + Analysis,
// new screens (My Page hub, Admin dashboard, Transactions, Account Settings).

function WireIA() {
  const node = (label, sub, w = 110) => (
    <div className="w-card" style={{ padding: '8px 12px', minWidth: w, textAlign: 'center', background: W.bg }}>
      <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      {sub && <div className="w-faint" style={{ fontSize: 10, marginTop: 2 }}>{sub}</div>}
    </div>
  );
  const tier = (children, gap = 16) => (
    <div className="w-row" style={{ gap, justifyContent: 'center', flexWrap: 'wrap' }}>{children}</div>
  );
  const connect = { width: 1, height: 18, background: W.hairline, margin: '0 auto' };
  const hbar = { height: 1, background: W.hairline };

  // v2 nav: 6 primary items (heatmap removed)
  const primary = [
    { t: '홈', en: 'Home' },
    { t: '분석', en: 'Analysis' },
    { t: '종목 검색', en: 'Screener' },
    { t: '고수 따라잡기', en: 'Masters' },
    { t: '리포트', en: 'Reports' },
    { t: '학습', en: 'Learn' },
    { t: '포트폴리오', en: 'Portfolio' },
  ];

  // v2 sub-pages per section
  const sections = [
    { t: '홈', sub: [
      '관심종목 위젯',
      '주요 지수 (KR/US)',
      '미국 주요 종목 스트립',
      '한국 주요 종목 스트립',
      '시장 심리 게이지 (VIX·F&G)',
      '주요 뉴스',
      '경제 캘린더',
      '히트맵 미니 위젯',
      '내 포트폴리오 요약',
    ] },
    { t: '분석', sub: [
      '시장 개관',
      '섹터 / 스타일 로테이션',
      '실시간 차트 (TV급)',
      '기술적 지표 패널',
      '재무제표 시각화 (BS/IS/CF)',
      '퀀트 팩터 점수',
      'DCF 밸류에이션 계산기',
      '신호 알림 (골든크로스 등)',
      '시장 지도 (히트맵 풀)',
    ] },
    { t: '종목 검색', sub: [
      '팩터 필터 (PER/PBR/ROE…)',
      '결과 테이블',
      '결과 시각화 (히트맵/차트)',
      '저장한 검색 조건',
      '시장별 / 섹터별',
      '거장 스타일 프리셋',
    ] },
    { t: '고수 따라잡기', sub: [
      '고수 목록',
      '고수 상세 (포트폴리오)',
      '투자 철학 / 원칙',
      '분기 보유 변경 (13F)',
      '대표 사례 분석',
      '추천 도서 · 영상',
      '내가 팔로우한 고수',
    ] },
    { t: '학습', sub: [
      '용어 사전 (검색)',
      '카테고리 가이드',
      '재무제표 읽는 법',
      '기술적 분석 입문',
      '퀀트 팩터 입문',
      '내 북마크',
    ] },
    { t: '포트폴리오', sub: [
      '요약 (수익률/손익)',
      '보유 종목 목록',
      '자산 배분 (도넛/트리)',
      '섹터 / 국가 분산',
      '리밸런싱 제안',
      '리스크 (베타·샤프)',
      '배당 캘린더',
      '벤치마크 비교',
    ] },
  ];

  // v2 personal-area sub-pages (under profile dropdown / star menu)
  const personal = [
    { t: '마이페이지', sub: [
      '내 관심종목 (여러 리스트)',
      '팔로우한 고수',
      '북마크한 용어/가이드',
      '저장한 검색 조건',
      '활동 요약',
    ] },
    { t: '거래 내역', sub: [
      '매수/매도 입력',
      '거래 목록 (필터·검색)',
      '실현 손익',
      '세금/수수료 요약',
      'CSV 가져오기/내보내기',
    ] },
    { t: '메모 / 일지', sub: [
      '종목별 메모',
      '투자 일지',
      '가설 · 검증 노트',
      '태그 / 검색',
    ] },
    { t: '계정 설정', sub: [
      '프로필',
      '비밀번호 / 연결된 소셜',
      '기본 통화 (KRW/USD)',
      '언어 / 타임존',
      '테마 (다크/라이트)',
      '알림 환경설정',
      '데이터 내보내기',
    ] },
  ];

  const adminPages = [
    '고수 CRUD (소개·철학·어록)',
    '13F 자동 파싱 + 보정',
    '학습 콘텐츠 CRUD',
    '용어 사전 CRUD',
    '뉴스 큐레이션 / 핀',
    '사용자 관리',
    'API 사용량 모니터',
    '데이터 품질 / Cron 로그',
  ];

  return (
    <div className="w-root" style={{ padding: '32px 28px', background: '#fafafa', overflow: 'auto' }}>
      <div style={{ marginBottom: 8 }}>
        <div className="w-tag">Information Architecture · v2</div>
      </div>
      <h1 className="w-h1" style={{ marginBottom: 4, fontSize: 22 }}>STOCKLAB · Site Map v2</h1>
      <div className="w-muted" style={{ marginBottom: 24, fontSize: 12 }}>
        주식 분석 · 학습 · 포트폴리오 관리 — 메뉴 한국화 / 마이페이지 · 관리자 영역 추가
      </div>

      {/* Root */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="w-card" style={{ padding: '10px 20px', background: W.ink, color: '#fff', borderColor: W.ink }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>STOCKLAB</div>
          <div style={{ fontSize: 10, opacity: 0.7 }}>app.stocklab.io</div>
        </div>
      </div>
      <div style={connect} />

      {/* Auth gate */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 8 }}>
        <div className="w-card" style={{ padding: '6px 12px', background: W.fill }}>
          <span className="w-tag" style={{ borderColor: W.muted, color: W.muted }}>Public</span>
          <span style={{ marginLeft: 8, fontSize: 12 }}>로그인 / 회원가입 / 약관</span>
        </div>
        <div className="w-card" style={{ padding: '6px 12px', borderColor: W.accent, color: W.accent }}>
          <span className="w-tag" style={{ borderColor: W.accent, color: W.accent }}>Auth</span>
          <span style={{ marginLeft: 8, fontSize: 12 }}>로그인 후 접근</span>
        </div>
        <div className="w-card" style={{ padding: '6px 12px', borderColor: W.down, color: W.down }}>
          <span className="w-tag" style={{ borderColor: W.down, color: W.down }}>Admin</span>
          <span style={{ marginLeft: 8, fontSize: 12 }}>관리자 전용</span>
        </div>
      </div>
      <div style={connect} />

      {/* Top-level nav (v2 — 6 items) */}
      {tier(primary.map(p => (
        <div key={p.t}>{node(p.t, p.en, 110)}</div>
      )), 12)}

      <div style={{ ...hbar, margin: '20px 0' }} />

      {/* Per-section sub-pages */}
      <div className="w-h3" style={{ marginBottom: 8 }}>1차 내비 — 섹션별 하위 화면</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
        {sections.map(col => (
          <div key={col.t} className="w-col" style={{ gap: 5 }}>
            <div className="w-h3" style={{ textAlign: 'center', marginBottom: 4 }}>{col.t}</div>
            {col.sub.map(s => (
              <div key={s} className="w-card-soft" style={{
                padding: '5px 8px', fontSize: 10.5, background: W.bg, textAlign: 'center', lineHeight: 1.3,
              }}>
                {s}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ ...hbar, margin: '20px 0' }} />

      {/* Personal area */}
      <div className="w-row" style={{ alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 3 }}>
          <div className="w-h3" style={{ marginBottom: 8 }}>
            개인 영역 — 헤더 ★ 드롭다운 / 프로필 메뉴에서 진입
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {personal.map(col => (
              <div key={col.t} className="w-col" style={{ gap: 5 }}>
                <div className="w-h3" style={{ textAlign: 'center', marginBottom: 4, color: W.accent }}>{col.t}</div>
                {col.sub.map(s => (
                  <div key={s} className="w-card-soft" style={{
                    padding: '5px 8px', fontSize: 10.5, background: W.bg, textAlign: 'center', lineHeight: 1.3,
                    borderColor: W.accent, color: W.ink,
                  }}>
                    {s}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="w-h3" style={{ marginBottom: 8, color: W.down }}>관리자 (/admin)</div>
          <div className="w-col" style={{ gap: 5 }}>
            {adminPages.map(s => (
              <div key={s} className="w-card-soft" style={{
                padding: '5px 8px', fontSize: 10.5, background: W.bg,
                borderColor: W.down, color: W.ink,
              }}>
                · {s}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...hbar, margin: '20px 0' }} />

      {/* Cross-cutting */}
      <div className="w-row" style={{ gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div className="w-h3" style={{ marginBottom: 6 }}>크로스컷팅</div>
          <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 11, color: W.muted, lineHeight: 1.7 }}>
            <li>전역 검색 (⌘K) — 종목/고수/용어 통합</li>
            <li>★ 즐겨찾기는 종목/고수/용어 어디서든 가능</li>
            <li>알림 종 — 가격/신호/13F/배당/공시</li>
            <li>다크·라이트 토글은 헤더에 상시 노출</li>
            <li>히트맵은 메뉴에서 빠지고 홈 위젯 + 분석 하위로</li>
          </ul>
        </div>
        <div style={{ flex: 1 }}>
          <div className="w-h3" style={{ marginBottom: 6 }}>주요 사용자 흐름</div>
          <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 11, color: W.muted, lineHeight: 1.7 }}>
            <li>로그인 → 홈 → 관심종목 → 종목 상세 → 거래 내역 입력 → 포트폴리오 반영</li>
            <li>홈 → 고수 따라잡기 → Buffett 포트폴리오 → 신규 보유 종목 → 분석</li>
            <li>종목 검색 → 필터 적용 → 결과 클릭 → 분석 → DCF 계산</li>
            <li>학습 → 용어 검색 → 종목 상세 재무탭에서 툴팁으로 연결</li>
          </ul>
        </div>
        <div style={{ flex: 1 }}>
          <div className="w-h3" style={{ marginBottom: 6 }}>데이터 (요약 — 별도 다이어그램 참고)</div>
          <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 11, color: W.muted, lineHeight: 1.7 }}>
            <li>시세: Alpha Vantage (US) · KRX OpenAPI (KR)</li>
            <li>재무: SEC EDGAR · DART</li>
            <li>13F: SEC 13F-HR 분기 파싱</li>
            <li>뉴스: NewsAPI · 매크로: FRED</li>
            <li>저장: Supabase · 캐시: Vercel Cron + Edge</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

window.WireIA = WireIA;
