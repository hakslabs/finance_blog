// Masters — 거장 목록 + 거장 상세 (포트폴리오, 철학, 13F 분기 변화)
// Learn — 학습 (용어사전 + 가이드 + 리포트 라이브러리)

function WireMasters() {
  const masters = [
    { n: 'Warren Buffett', f: 'Berkshire Hathaway', s: '가치 · 장기보유', aum: '$320B', n_holdings: 47 },
    { n: 'Charlie Munger', f: '— · 작고', s: '집중투자 · 멘탈모델', aum: '—', n_holdings: 0 },
    { n: 'Peter Lynch', f: 'Magellan (전)', s: '성장 · 생활속 발굴', aum: '—', n_holdings: 0 },
    { n: 'Benjamin Graham', f: '가치투자 원조', s: '안전마진 · 정량', aum: '—', n_holdings: 0 },
    { n: 'Ray Dalio', f: 'Bridgewater', s: '매크로 · 올웨더', aum: '$170B', n_holdings: 380 },
    { n: 'Cathie Wood', f: 'ARK Invest', s: '파괴적 혁신', aum: '$13B', n_holdings: 36 },
    { n: 'Michael Burry', f: 'Scion', s: '컨트래리언 · 숏', aum: '$200M', n_holdings: 11 },
  ];

  return (
    <div className="w-root">
      <AppBar active="masters" />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        <div>
          <h1 className="w-h1">고수 따라잡기</h1>
          <div className="w-faint" style={{ fontSize: 11, marginTop: 2 }}>
            거장들의 포트폴리오 · 투자 철학 · 13F 분기 변화 트래킹
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 12 }}>
          <div className="w-card" style={{ padding: 0 }}>
            <div style={{ padding: 10, borderBottom: `1px solid ${W.hairline}` }}>
              <div className="w-input w-row" style={{ gap: 6 }}>
                <span className="w-faint" style={{ fontSize: 11 }}>⌕</span>
                <span className="w-faint" style={{ fontSize: 12 }}>거장 검색</span>
              </div>
            </div>
            {masters.map((m, i) => (
              <div key={m.n} className="w-row" style={{
                padding: '10px 12px', gap: 10,
                borderBottom: i < masters.length - 1 ? `1px solid ${W.hairline}` : 'none',
                background: i === 0 ? W.fill : W.bg,
              }}>
                <div style={{ width: 32, height: 32, border: `1px solid ${W.line}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>
                  {m.n.split(' ').map(p => p[0]).join('')}
                </div>
                <div className="w-grow">
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{m.n}</div>
                  <div className="w-faint" style={{ fontSize: 10 }}>{m.f} · {m.s}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="w-col" style={{ gap: 12 }}>
            <div className="w-card" style={{ padding: 16 }}>
              <div className="w-row" style={{ gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 64, height: 64, border: `1px solid ${W.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>WB</div>
                <div className="w-grow">
                  <h2 className="w-h1">Warren Buffett</h2>
                  <div className="w-faint" style={{ fontSize: 12, marginTop: 2 }}>Berkshire Hathaway · 가치투자 · 장기보유</div>
                  <div className="w-row" style={{ gap: 12, marginTop: 8 }}>
                    <div><div className="w-h3" style={{ fontSize: 9 }}>운용자산</div><div className="w-num-md" style={{ fontSize: 14 }}>$320B</div></div>
                    <div className="w-vrule" />
                    <div><div className="w-h3" style={{ fontSize: 9 }}>보유 종목</div><div className="w-num-md" style={{ fontSize: 14 }}>47</div></div>
                    <div className="w-vrule" />
                    <div><div className="w-h3" style={{ fontSize: 9 }}>최근 신고</div><div className="w-num-md" style={{ fontSize: 14 }}>2026 Q1</div></div>
                    <div className="w-vrule" />
                    <div><div className="w-h3" style={{ fontSize: 9 }}>5Y CAGR</div><div className="w-num-md w-up" style={{ fontSize: 14 }}>+13.4%</div></div>
                  </div>
                </div>
                <button className="w-btn">★ 팔로우</button>
              </div>
            </div>

            <div className="w-row" style={{ borderBottom: `1px solid ${W.hairline}` }}>
              {['포트폴리오', '13F 분기 변화', '투자 철학', '대표 사례', '추천 도서'].map((t, i) => (
                <div key={t} style={{
                  padding: '8px 14px', fontSize: 12,
                  fontWeight: i <= 1 ? 600 : 400, color: i <= 1 ? W.ink : W.muted,
                  borderBottom: i === 0 ? `2px solid ${W.ink}` : '2px solid transparent',
                  position: 'relative', top: 1,
                }}>{t}</div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="w-card" style={{ padding: 12 }}>
                <h2 className="w-h2" style={{ marginBottom: 8 }}>상위 보유 종목</h2>
                <div className="w-rule" style={{ marginBottom: 6 }} />
                {[
                  { tk: 'AAPL', nm: 'Apple', w: 41.2, ch: '−2.1%', up: false },
                  { tk: 'BAC', nm: 'Bank of America', w: 9.8, ch: '0%', up: null },
                  { tk: 'AXP', nm: 'American Express', w: 8.4, ch: '+0.4%', up: true },
                  { tk: 'KO', nm: 'Coca-Cola', w: 7.1, ch: '0%', up: null },
                  { tk: 'CVX', nm: 'Chevron', w: 6.2, ch: '−1.8%', up: false },
                  { tk: 'OXY', nm: 'Occidental', w: 4.9, ch: '+1.2%', up: true },
                ].map((h, i) => (
                  <div key={h.tk} className="w-row" style={{ gap: 8, padding: '6px 0', borderBottom: i < 5 ? `1px solid ${W.hairline}` : 'none', fontSize: 11 }}>
                    <span className="w-mono" style={{ width: 56, fontWeight: 600 }}>{h.tk}</span>
                    <span className="w-grow w-faint" style={{ fontSize: 10 }}>{h.nm}</span>
                    <div style={{ width: 80, position: 'relative', height: 8, background: W.fill }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${h.w * 2}%`, background: W.ink }} />
                    </div>
                    <span className="w-mono" style={{ width: 40, textAlign: 'right' }}>{h.w}%</span>
                    <span className={'w-mono ' + (h.up === null ? 'w-faint' : (h.up ? 'w-up' : 'w-down'))} style={{ width: 50, textAlign: 'right', fontSize: 10 }}>{h.ch}</span>
                  </div>
                ))}
              </div>

              <div className="w-card" style={{ padding: 12 }}>
                <h2 className="w-h2" style={{ marginBottom: 8 }}>섹터 분포 & 성과</h2>
                <div className="w-rule" style={{ marginBottom: 8 }} />
                <div className="w-row" style={{ gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: 26, gap: 1, flex: 1 }}>
                    {[['IT', 'span 2 / span 3'], ['금융', 'span 2 / span 2'], ['소비재', 'span 1 / span 1'], ['에너지', 'span 1 / span 2'], ['기타', 'span 1 / span 1']].map(([l, ga]) => (
                      <div key={l} style={{ background: W.fill, border: `1px solid ${W.hairline}`, padding: 3, fontSize: 9, gridArea: ga }}>{l}</div>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div className="w-h3" style={{ fontSize: 9, marginBottom: 4 }}>10년 누적 성과 vs S&P 500</div>
                  <AreaChart seed="buffett" width={260} height={70} color={W.ink} />
                </div>
              </div>
            </div>

            {/* 13F 분기 변화 표 (NEW) */}
            <div className="w-card" style={{ padding: 12 }}>
              <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <h2 className="w-h2">13F 분기 변화 — 최근 5분기</h2>
                <div className="w-row" style={{ gap: 6 }}>
                  <span className="w-pill" style={{ background: W.fill }}>전체</span>
                  <span className="w-pill">신규</span>
                  <span className="w-pill">증가</span>
                  <span className="w-pill">감소</span>
                  <span className="w-pill">청산</span>
                </div>
              </div>
              <div className="w-rule" style={{ marginBottom: 6 }} />
              <div className="w-row" style={{ fontSize: 10, fontWeight: 600, color: W.muted, padding: '6px 0', borderBottom: `1px solid ${W.hairline}` }}>
                <span style={{ width: 64 }}>티커</span>
                <span className="w-grow">종목명</span>
                <span style={{ width: 60, textAlign: 'right' }}>2025 Q1</span>
                <span style={{ width: 60, textAlign: 'right' }}>Q2</span>
                <span style={{ width: 60, textAlign: 'right' }}>Q3</span>
                <span style={{ width: 60, textAlign: 'right' }}>Q4</span>
                <span style={{ width: 60, textAlign: 'right' }}>2026 Q1</span>
                <span style={{ width: 56, textAlign: 'center' }}>변화</span>
              </div>
              {[
                ['AAPL', 'Apple', ['915M','905M','905M','300M','295M'], '−1%', 'down'],
                ['BAC', 'Bank of America', ['1.0B','1.0B','1.0B','1.0B','1.0B'], '0%', 'flat'],
                ['CB', 'Chubb', ['—','—','25.9M','27.0M','27.0M'], '신규', 'new'],
                ['OXY', 'Occidental', ['244M','248M','255M','255M','286M'], '+12%', 'up'],
                ['HPQ', 'HP Inc.', ['62M','55M','22M','—','—'], '청산', 'exit'],
                ['PARA', 'Paramount', ['93M','78M','15M','—','—'], '청산', 'exit'],
                ['SIRI', 'SiriusXM', ['—','40M','105M','108M','120M'], '+11%', 'up'],
              ].map((r, i) => {
                const tagColor = { up: W.up, down: W.down, new: W.up, exit: W.down, flat: W.muted };
                return (
                  <div key={i} className="w-row" style={{ fontSize: 10, padding: '6px 0', borderBottom: i < 6 ? `1px solid ${W.hairline}` : 'none' }}>
                    <span className="w-mono" style={{ width: 64, fontWeight: 600 }}>{r[0]}</span>
                    <span className="w-grow w-faint">{r[1]}</span>
                    {r[2].map((v, j) => (
                      <span key={j} className="w-mono" style={{ width: 60, textAlign: 'right', color: v === '—' ? W.faint : W.ink }}>{v}</span>
                    ))}
                    <span style={{
                      width: 56, textAlign: 'center', fontSize: 9, fontWeight: 600,
                      color: tagColor[r[4]],
                      background: tagColor[r[4]] + '22',
                      padding: '2px 4px',
                    }}>{r[3]}</span>
                  </div>
                );
              })}
              <div className="w-faint" style={{ fontSize: 10, marginTop: 8 }}>
                * 보유주식수 기준. 출처: SEC EDGAR 13F-HR · 분기말 기준 45일 후 신고 · 자동 갱신
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
              <div className="w-card" style={{ padding: 12 }}>
                <h2 className="w-h2" style={{ marginBottom: 8 }}>투자 원칙 (요약)</h2>
                <div className="w-rule" style={{ marginBottom: 8 }} />
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, lineHeight: 1.7, color: W.ink }}>
                  <li>이해할 수 있는 사업에만 투자한다 (Circle of competence)</li>
                  <li>경제적 해자(Moat)가 있는 기업을 우선 검토</li>
                  <li>탁월한 경영진 — 정직하고 주주친화적</li>
                  <li>안전마진(Margin of Safety) 확보된 가격에서만 매수</li>
                  <li>"가장 좋아하는 보유 기간은 영원" — 장기보유</li>
                </ul>
                <div className="w-faint" style={{ fontSize: 10, marginTop: 10 }}>분석 방법론 자세히 보기 →</div>
              </div>

              <div className="w-card" style={{ padding: 12 }}>
                <h2 className="w-h2" style={{ marginBottom: 8 }}>최근 보유 변경 (Q1 2026)</h2>
                <div className="w-rule" style={{ marginBottom: 8 }} />
                <div className="w-col" style={{ gap: 4, fontSize: 11 }}>
                  {[
                    ['신규', 'CB · Chubb', 'w-up'],
                    ['증가', 'OXY +12%', 'w-up'],
                    ['감소', 'AAPL −1%', 'w-down'],
                    ['청산', 'HPQ', 'w-down'],
                    ['청산', 'PARA', 'w-down'],
                  ].map((r, i) => (
                    <div key={i} className="w-row" style={{ gap: 8, padding: '4px 0', borderBottom: i < 4 ? `1px solid ${W.hairline}` : 'none' }}>
                      <span className="w-tag" style={{ fontSize: 9, padding: '0 4px' }}>{r[0]}</span>
                      <span className={'w-grow ' + r[2]}>{r[1]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reports — 리포트 라이브러리 (별도 메뉴)
// 한국은행/KDI/IMF/SEC EDGAR 등 30+ 소스 RSS 폴링 → Docling 추출 → Gemini AI 요약
function WireReports() {
  const reports = [
    { src: '한국은행', srcCat: 'KR', cat: '거시', sub: '통화신용정책보고서', title: '2025년 9월 통화신용정책보고서', date: '2025.09.26', pages: 124, lang: 'ko', summary: '물가 안정세 지속, 가계부채 점진적 둔화. 기준금리 동결 시사.', tags: ['금리','부동산','가계부채'], aiDone: true },
    { src: 'SEC EDGAR', srcCat: 'US', cat: '13F', sub: '13F-HR', title: 'Berkshire Hathaway · Q3 2025 13F-HR', date: '2025.11.14', pages: 32, lang: 'en', summary: 'AAPL 비중 추가 축소, OXY 신규 매수 350M. 현금 비중 사상 최고.', tags: ['Buffett','13F','대형주'], aiDone: true },
    { src: 'IMF', srcCat: 'GLOBAL', cat: '거시', sub: 'World Economic Outlook', title: 'World Economic Outlook · October 2025', date: '2025.10.15', pages: 218, lang: 'en', summary: '글로벌 GDP 성장률 3.2% 전망. 미국 견조, 중국 둔화, 유럽 회복 지연.', tags: ['글로벌GDP','연준','달러'], aiDone: true },
    { src: 'KDI', srcCat: 'KR', cat: '거시', sub: '경제전망', title: '2025년 하반기 경제전망', date: '2025.11.05', pages: 96, lang: 'ko', summary: '2025년 성장률 2.0%, 2026년 1.9% 전망. 반도체 회복이 견인.', tags: ['반도체','수출','내수'], aiDone: true },
    { src: 'BlackRock', srcCat: 'US', cat: '리서치', sub: 'Investment Institute', title: '2026 Outlook: AI Capex Cycle', date: '2025.11.20', pages: 18, lang: 'en', summary: 'AI 인프라 투자 사이클 본격화, 데이터센터·전력·반도체 멀티 사이클.', tags: ['AI','반도체','전력'], aiDone: true },
    { src: 'DART', srcCat: 'KR', cat: '공시', sub: '8-K급 주요공시', title: '삼성전자 · 자기주식 취득 신탁계약 체결', date: '2025.11.18', pages: 4, lang: 'ko', summary: '7조원 규모 자사주 취득. 향후 1년 내 매입 예정.', tags: ['삼성전자','자사주'], aiDone: false },
    { src: 'OECD', srcCat: 'GLOBAL', cat: '거시', sub: 'Economic Outlook', title: 'OECD Economic Outlook 118', date: '2025.11.12', pages: 282, lang: 'en', summary: '회원국 평균 성장률 1.6%. 한국 1.9% 전망. 인플레 안정화 진입.', tags: ['OECD','인플레','금리'], aiDone: true },
    { src: '삼정KPMG', srcCat: 'KR', cat: '산업', sub: '인사이트', title: 'AI 반도체 산업 동향과 투자 기회', date: '2025.11.10', pages: 42, lang: 'ko', summary: 'HBM·CXL 수요 급증. 국내 메모리 3사 수혜 전망.', tags: ['반도체','HBM','SK하이닉스'], aiDone: true },
  ];

  return (
    <div className="w-root">
      <AppBar active="reports" />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        <div className="w-row" style={{ alignItems: 'flex-end', gap: 12 }}>
          <div className="w-grow">
            <h1 className="w-h1">리포트</h1>
            <div className="w-faint" style={{ fontSize: 11, marginTop: 2 }}>
              한국은행 · KDI · IMF · OECD · SEC EDGAR · 증권사 리서치 · 글로벌 IB — 30+ 소스 자동 수집 + AI 요약
            </div>
          </div>
          <span className="w-faint" style={{ fontSize: 10 }}>마지막 갱신 06:32 ↻</span>
        </div>

        {/* Filters */}
        <div className="w-card" style={{ padding: 12 }}>
          <div className="w-row" style={{ gap: 8, marginBottom: 8 }}>
            <div className="w-input w-row w-grow" style={{ gap: 6, maxWidth: 320 }}>
              <span className="w-faint" style={{ fontSize: 11 }}>⌕</span>
              <span className="w-faint" style={{ fontSize: 12 }}>리포트 검색 (제목 · 태그 · 본문)</span>
            </div>
            <span className="w-faint" style={{ fontSize: 11, alignSelf: 'center' }}>정렬:</span>
            <span className="w-pill" style={{ background: W.fill }}>최신</span>
            <span className="w-pill">인기</span>
            <span className="w-pill">관련도</span>
          </div>
          <div className="w-rule" style={{ marginBottom: 8 }} />
          <div className="w-row" style={{ gap: 4, flexWrap: 'wrap' }}>
            <span className="w-h3" style={{ fontSize: 9, alignSelf: 'center', marginRight: 4 }}>카테고리:</span>
            {['전체','거시','산업','공시','13F','리서치'].map((t,i) => (
              <span key={t} className="w-pill" style={{ background: i === 0 ? W.fill : W.bg }}>{t}</span>
            ))}
            <div className="w-vrule" style={{ margin: '0 4px' }} />
            <span className="w-h3" style={{ fontSize: 9, alignSelf: 'center', marginRight: 4 }}>지역:</span>
            {['전체','한국','미국','글로벌'].map((t,i) => (
              <span key={t} className="w-pill" style={{ background: i === 0 ? W.fill : W.bg }}>{t}</span>
            ))}
            <div className="w-vrule" style={{ margin: '0 4px' }} />
            <span className="w-h3" style={{ fontSize: 9, alignSelf: 'center', marginRight: 4 }}>기간:</span>
            {['최근 7일','30일','90일','전체'].map((t,i) => (
              <span key={t} className="w-pill" style={{ background: i === 1 ? W.fill : W.bg }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div className="w-row" style={{ gap: 16, flexWrap: 'wrap' }}>
          <div className="w-card-soft" style={{ padding: '8px 12px', fontSize: 11 }}>
            <span className="w-faint">총 보고서</span>{' '}
            <span className="w-mono" style={{ fontWeight: 600 }}>2,847</span>
          </div>
          <div className="w-card-soft" style={{ padding: '8px 12px', fontSize: 11 }}>
            <span className="w-faint">이번 주 신규</span>{' '}
            <span className="w-mono w-up" style={{ fontWeight: 600 }}>+47</span>
          </div>
          <div className="w-card-soft" style={{ padding: '8px 12px', fontSize: 11 }}>
            <span className="w-faint">활성 소스</span>{' '}
            <span className="w-mono" style={{ fontWeight: 600 }}>30</span>
          </div>
          <div className="w-card-soft" style={{ padding: '8px 12px', fontSize: 11 }}>
            <span className="w-faint">AI 처리 완료</span>{' '}
            <span className="w-mono" style={{ fontWeight: 600 }}>94%</span>
          </div>
        </div>

        {/* Report cards */}
        <div className="w-col" style={{ gap: 8 }}>
          {reports.map((r, i) => {
            const flagBg = r.srcCat === 'KR' ? '#1f8a5b22' : r.srcCat === 'US' ? '#2d6cdf22' : '#88888822';
            const flagText = r.srcCat === 'KR' ? '🇰🇷 KR' : r.srcCat === 'US' ? '🇺🇸 US' : '🌐 GLOBAL';
            return (
              <div key={i} className="w-card" style={{ padding: 12, cursor: 'pointer' }}>
                <div className="w-row" style={{ gap: 12, alignItems: 'flex-start' }}>
                  <Placeholder label="PDF" width={56} height={72} />
                  <div className="w-grow">
                    <div className="w-row" style={{ gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span className="w-pill" style={{ background: flagBg, fontSize: 9 }}>{flagText}</span>
                      <span className="w-pill" style={{ fontSize: 9 }}>{r.cat}</span>
                      <span className="w-faint w-mono" style={{ fontSize: 10 }}>{r.src} · {r.sub}</span>
                      <div className="w-grow" />
                      {r.aiDone && <span className="w-pill" style={{ fontSize: 9, background: W.accent + '22', color: W.accent }}>AI 요약</span>}
                      {!r.aiDone && <span className="w-pill" style={{ fontSize: 9, color: W.muted }}>처리중</span>}
                      <span className="w-faint w-mono" style={{ fontSize: 10 }}>{r.date}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{r.title}</div>
                    {r.aiDone ? (
                      <div className="w-faint" style={{ fontSize: 11, lineHeight: 1.5, marginBottom: 6 }}>{r.summary}</div>
                    ) : (
                      <div className="w-faint" style={{ fontSize: 11, fontStyle: 'italic', marginBottom: 6 }}>
                        Docling 본문 추출 진행 중 — 곧 요약 제공
                      </div>
                    )}
                    <div className="w-row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      {r.tags.map(t => (
                        <span key={t} className="w-tag" style={{ fontSize: 9 }}>#{t}</span>
                      ))}
                      <div className="w-grow" />
                      <span className="w-faint" style={{ fontSize: 10 }}>{r.pages}p · {r.lang.toUpperCase()}</span>
                      <span className="w-faint" style={{ fontSize: 11 }}>★</span>
                      <span style={{ color: W.accent, fontSize: 11 }}>본문 보기 →</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        <div className="w-row" style={{ justifyContent: 'center', gap: 4, marginTop: 8 }}>
          <span className="w-pill">‹</span>
          <span className="w-pill" style={{ background: W.fill }}>1</span>
          <span className="w-pill">2</span>
          <span className="w-pill">3</span>
          <span className="w-pill">…</span>
          <span className="w-pill">58</span>
          <span className="w-pill">›</span>
        </div>
      </div>
    </div>
  );
}

// Learn — 학습 (입문서·칼럼 + 용어사전)
function WireLearn() {
  const [tab, setTab] = React.useState('입문서·칼럼');
  const cats = [
    ['재무제표 읽는 법', 12], ['기술적 분석 입문', 18], ['가치투자 기초', 9],
    ['퀀트 팩터 입문', 14], ['옵션·파생', 8], ['매크로·금리', 6],
  ];
  const terms = [
    ['PER', '주가수익비율', '주가 ÷ 주당순이익. 낮을수록 저평가일 가능성.'],
    ['PBR', '주가순자산비율', '주가 ÷ 주당순자산. 1 미만이면 청산가치 이하.'],
    ['ROE', '자기자본이익률', '순이익 ÷ 자기자본. 높을수록 자본 효율 좋음.'],
    ['EPS', '주당순이익', '순이익 ÷ 발행주식수.'],
    ['EV/EBITDA', '기업가치 / 상각전영업이익', '인수합병 관점 가치 측정.'],
    ['Beta', '베타', '시장 대비 변동성. 1 = 시장과 동일.'],
  ];

  return (
    <div className="w-root">
      <AppBar active="learn" />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        <div>
          <h1 className="w-h1">학습</h1>
          <div className="w-faint" style={{ fontSize: 11, marginTop: 2 }}>입문서 · 칼럼 · 용어 사전 · 분석 방법론</div>
        </div>

        {/* Tab strip */}
        <div className="w-row" style={{ borderBottom: `1px solid ${W.hairline}` }}>
          {['입문서·칼럼', '용어 사전'].map(t => (
            <div key={t} onClick={() => setTab(t)} style={{
              padding: '8px 14px', fontSize: 12, cursor: 'pointer',
              fontWeight: t === tab ? 600 : 400, color: t === tab ? W.ink : W.muted,
              borderBottom: t === tab ? `2px solid ${W.ink}` : '2px solid transparent',
              position: 'relative', top: 1,
            }}>{t}</div>
          ))}
        </div>

        {/* === 입문서·칼럼 탭 === */}
        {tab === '입문서·칼럼' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 12 }}>
            <div className="w-col" style={{ gap: 12 }}>
              <div className="w-card" style={{ padding: 12 }}>
                <h2 className="w-h2" style={{ marginBottom: 8 }}>카테고리</h2>
                <div className="w-rule" style={{ marginBottom: 8 }} />
                <div className="w-col" style={{ gap: 4 }}>
                  {cats.map(([c, n]) => (
                    <div key={c} className="w-row" style={{ padding: '6px 8px', fontSize: 12, justifyContent: 'space-between', borderRadius: 2, background: W.bg, border: `1px solid ${W.hairline}` }}>
                      <span>{c}</span><span className="w-faint w-mono" style={{ fontSize: 10 }}>{n}편</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-card" style={{ padding: 12 }}>
              <h2 className="w-h2" style={{ marginBottom: 8 }}>이번 주 추천</h2>
              <div className="w-rule" style={{ marginBottom: 8 }} />
              <div className="w-col" style={{ gap: 8 }}>
                {[
                  ['DCF 모델, 가정 5개로 끝내기', '15분', '재무'],
                  ['골든크로스, 정말 작동할까? 백테스트', '8분', '기술'],
                  ['Graham의 Net-Net 종목 찾기', '12분', '가치'],
                  ['ROE 분해 — DuPont 5단계', '10분', '재무'],
                ].map(([t, m, c], i) => (
                  <div key={i} className="w-row" style={{ gap: 10, padding: '6px 0', borderBottom: i < 3 ? `1px solid ${W.hairline}` : 'none' }}>
                    <Placeholder label="썸네일" width={64} height={40} />
                    <div className="w-grow">
                      <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>{t}</div>
                      <div className="w-row" style={{ gap: 6, marginTop: 4 }}>
                        <span className="w-tag" style={{ fontSize: 9, padding: '0 4px' }}>{c}</span>
                        <span className="w-faint" style={{ fontSize: 10 }}>{m}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === 용어사전 탭 === */}
        {tab === '용어 사전' && (
          <div className="w-card" style={{ padding: 12 }}>
            <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <h2 className="w-h2">용어 사전 <span className="w-faint" style={{ fontSize: 11, fontWeight: 400 }}>· 1,240개</span></h2>
              <div className="w-input w-row" style={{ gap: 6, width: 200 }}>
                <span className="w-faint" style={{ fontSize: 11 }}>⌕</span>
                <span className="w-faint" style={{ fontSize: 12 }}>용어 검색</span>
              </div>
            </div>
            <div className="w-row" style={{ gap: 4, marginBottom: 8 }}>
              {['전체', '재무지표', '기술적', '퀀트', '거시', '옵션'].map((t, i) => (
                <span key={t} className="w-pill" style={{ background: i === 0 ? W.fill : W.bg }}>{t}</span>
              ))}
            </div>
            <div className="w-rule" style={{ marginBottom: 6 }} />
            <div className="w-col" style={{ gap: 0 }}>
              {terms.map((t, i) => (
                <div key={i} className="w-row" style={{ gap: 12, padding: '8px 0', borderBottom: i < terms.length - 1 ? `1px solid ${W.hairline}` : 'none', alignItems: 'flex-start' }}>
                  <div style={{ width: 110 }}>
                    <div className="w-mono" style={{ fontSize: 12, fontWeight: 600 }}>{t[0]}</div>
                    <div className="w-faint" style={{ fontSize: 10 }}>{t[1]}</div>
                  </div>
                  <div className="w-grow" style={{ fontSize: 11, color: W.muted, lineHeight: 1.5 }}>{t[2]}</div>
                  <span className="w-faint" style={{ fontSize: 11 }}>★</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Report Detail — 리포트 본문 (Docling 마크다운 + AI 요약)
function WireReportDetail() {
  return (
    <div className="w-root">
      <AppBar active="learn" />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        {/* Breadcrumb */}
        <div className="w-row" style={{ gap: 6, fontSize: 11, color: W.muted }}>
          <span>학습</span><span>›</span><span>리포트</span><span>›</span>
          <span>거시</span><span>›</span><span style={{ color: W.ink }}>한국은행 통화신용정책보고서 2025.09</span>
        </div>

        {/* Header */}
        <div className="w-card" style={{ padding: 16 }}>
          <div className="w-row" style={{ gap: 16, alignItems: 'flex-start' }}>
            <Placeholder label="PDF\n표지" width={96} height={128} />
            <div className="w-grow">
              <div className="w-row" style={{ gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                <span className="w-pill" style={{ background: '#1f8a5b22', fontSize: 9 }}>🇰🇷 KR</span>
                <span className="w-pill" style={{ fontSize: 9 }}>거시</span>
                <span className="w-pill" style={{ fontSize: 9 }}>통화신용정책</span>
                <span className="w-pill" style={{ background: W.accent + '22', color: W.accent, fontSize: 9 }}>✓ AI 요약 완료</span>
              </div>
              <h1 className="w-h1">2025년 9월 통화신용정책보고서</h1>
              <div className="w-faint" style={{ fontSize: 12, marginTop: 4 }}>
                한국은행 · 통화정책국 · 2025.09.26 발간 · 124페이지 · 한국어
              </div>
              <div className="w-row" style={{ gap: 12, marginTop: 10 }}>
                <button className="w-btn">★ 북마크</button>
                <button className="w-btn">원문 PDF 열기 ↗</button>
                <button className="w-btn">메모 추가</button>
                <div className="w-grow" />
                <span className="w-faint" style={{ fontSize: 10, alignSelf: 'center' }}>조회 1,247회 · 북마크 89</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Summary card */}
        <div className="w-card" style={{ padding: 12, borderLeft: `3px solid ${W.accent}` }}>
          <div className="w-row" style={{ gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 16 }}>✨</span>
            <h2 className="w-h2">AI 요약 <span className="w-faint" style={{ fontWeight: 400, fontSize: 10 }}>· Gemini 1.5 Flash</span></h2>
            <div className="w-grow" />
            <span className="w-faint" style={{ fontSize: 10 }}>1,238 토큰 · 처리 4.2초</span>
          </div>
          <div className="w-rule" style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 12, lineHeight: 1.7, color: W.ink, marginBottom: 12 }}>
            한국 경제는 물가 안정세가 이어지는 가운데 가계부채 증가세도 점진적으로 둔화되고 있다.
            소비자물가 상승률은 2% 내외로 안정적이며, 가계부채 증가율은 분기 대비 0.4%p 하락했다.
            대외적으로는 미국 연준의 금리 인하 사이클이 시작되며 원/달러 환율 압력이 완화될 전망이다.
            한국은행은 현재 기준금리(3.25%)를 동결할 가능성이 높으며, 향후 인하 시점은 2026년 상반기로 예상된다.
          </div>
          <div className="w-h3" style={{ fontSize: 9, marginBottom: 4 }}>핵심 포인트</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, lineHeight: 1.8 }}>
            <li>소비자물가 상승률 2.0% — 목표치 부합</li>
            <li>가계부채 증가율 둔화 (전기 +1.2% → +0.8%)</li>
            <li>주택가격 안정세 진입, 일부 수도권은 여전히 상승</li>
            <li>대외 경상수지 흑자 지속, 외환보유액 4,200억 달러</li>
            <li>기준금리 동결 시사, 인하는 빨라야 2026 H1</li>
          </ul>
        </div>

        {/* 2-column: TOC + body */}
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 280px', gap: 12 }}>
          {/* TOC */}
          <div className="w-card" style={{ padding: 12, alignSelf: 'flex-start', position: 'sticky', top: 12 }}>
            <h2 className="w-h2" style={{ marginBottom: 8 }}>목차</h2>
            <div className="w-rule" style={{ marginBottom: 6 }} />
            <div className="w-col" style={{ gap: 4, fontSize: 11 }}>
              {[
                ['I. 총평', 4, true],
                ['II. 물가', 12, false],
                ['  · 소비자물가', 14, false],
                ['  · 근원물가', 22, false],
                ['III. 가계부채', 38, false],
                ['IV. 부동산 시장', 56, false],
                ['V. 대외 환경', 78, false],
                ['VI. 향후 전망', 102, false],
                ['VII. 부록 · 통계', 118, false],
              ].map(([t, p, active], i) => (
                <div key={i} className="w-row" style={{
                  gap: 6, padding: '4px 6px', justifyContent: 'space-between',
                  background: active ? W.fill : 'transparent',
                  borderLeft: active ? `2px solid ${W.ink}` : '2px solid transparent',
                }}>
                  <span style={{ fontWeight: active ? 600 : 400 }}>{t}</span>
                  <span className="w-faint w-mono" style={{ fontSize: 9 }}>{p}p</span>
                </div>
              ))}
            </div>
          </div>

          {/* Body — Docling rendered markdown */}
          <div className="w-card" style={{ padding: 16 }}>
            <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <h2 className="w-h2">본문 <span className="w-faint" style={{ fontWeight: 400, fontSize: 10 }}>· Docling 추출</span></h2>
              <div className="w-row" style={{ gap: 6 }}>
                <span className="w-pill">한글 원본</span>
                <span className="w-pill" style={{ background: W.fill }}>읽기 모드</span>
                <span className="w-pill">원본 PDF</span>
              </div>
            </div>
            <div className="w-rule" style={{ marginBottom: 12 }} />

            <div style={{ fontSize: 12, lineHeight: 1.8, color: W.ink }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>I. 총평</h3>
              <p style={{ margin: '0 0 12px' }}>
                2025년 9월 현재 한국 경제는 물가 안정세가 이어지는 가운데 가계부채 증가세도 점진적으로
                둔화되고 있다. 다만 일부 수도권 부동산 시장에서는 여전히 가격 상승 압력이 남아 있으며,
                대외적으로는 미국 연준의 금리 정책 변화가 향후 통화정책 운용에 중요한 변수로 작용할 전망이다.
              </p>

              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '20px 0 12px' }}>II. 물가</h3>
              <p style={{ margin: '0 0 12px' }}>
                소비자물가 상승률은 2025년 8월 기준 전년 동월 대비 2.0%로 한국은행의 물가 안정 목표(2%)에
                부합하는 수준을 유지하고 있다. 이는 국제 유가 안정과 식료품 가격 하락에 힘입은 결과로 분석된다.
              </p>

              {/* Table example — 표 1 */}
              <div className="w-faint" style={{ fontSize: 10, margin: '8px 0 4px' }}>표 1. 주요 물가 지표 (전년동월비, %)</div>
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', marginBottom: 12, border: `1px solid ${W.line}` }}>
                <thead>
                  <tr style={{ background: W.fill }}>
                    <th style={{ padding: 6, textAlign: 'left', borderBottom: `1px solid ${W.line}` }}>구분</th>
                    <th style={{ padding: 6, textAlign: 'right', borderBottom: `1px solid ${W.line}` }}>2024.12</th>
                    <th style={{ padding: 6, textAlign: 'right', borderBottom: `1px solid ${W.line}` }}>2025.06</th>
                    <th style={{ padding: 6, textAlign: 'right', borderBottom: `1px solid ${W.line}` }}>2025.08</th>
                  </tr>
                </thead>
                <tbody>
                  {[['소비자물가',2.4,2.1,2.0],['근원물가',2.0,1.9,1.8],['생활물가',3.1,2.4,2.2],['신선식품',8.2,3.4,2.8]].map((r,i) => (
                    <tr key={i}>
                      <td style={{ padding: 6, borderBottom: `1px solid ${W.hairline}` }}>{r[0]}</td>
                      <td className="w-mono" style={{ padding: 6, textAlign: 'right', borderBottom: `1px solid ${W.hairline}` }}>{r[1]}</td>
                      <td className="w-mono" style={{ padding: 6, textAlign: 'right', borderBottom: `1px solid ${W.hairline}` }}>{r[2]}</td>
                      <td className="w-mono" style={{ padding: 6, textAlign: 'right', borderBottom: `1px solid ${W.hairline}` }}>{r[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p style={{ margin: '0 0 12px' }}>
                근원물가도 1.8%로 안정세를 유지하고 있어 인플레이션 압력은 전반적으로 제어되고 있는 것으로 판단된다.
              </p>

              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '20px 0 12px' }}>III. 가계부채</h3>
              <p style={{ margin: '0 0 12px' }}>
                가계부채 증가율은 2분기 대비 0.4%p 하락한 0.8%를 기록했다. 정부의 DSR 규제 강화와
                금리 인상 누적 효과가 점진적으로 나타나고 있는 것으로 평가된다…
              </p>

              <div className="w-faint" style={{ fontSize: 10, marginTop: 24, paddingTop: 12, borderTop: `1px solid ${W.hairline}` }}>
                ⋯ (이하 110페이지) — 마크다운으로 변환된 전체 본문
              </div>
            </div>
          </div>

          {/* Right rail */}
          <div className="w-col" style={{ gap: 12 }}>
            {/* Related tickers */}
            <div className="w-card" style={{ padding: 12 }}>
              <h2 className="w-h2" style={{ marginBottom: 8 }}>관련 종목</h2>
              <div className="w-faint" style={{ fontSize: 10, marginBottom: 6 }}>AI 자동 태깅</div>
              <div className="w-rule" style={{ marginBottom: 6 }} />
              <div className="w-col" style={{ gap: 4, fontSize: 11 }}>
                {[['005930','삼성전자'],['055550','신한지주'],['086790','하나금융지주'],['034730','SK']].map((t,i) => (
                  <div key={i} className="w-row" style={{ gap: 8, padding: '4px 0' }}>
                    <span className="w-mono" style={{ width: 56, fontWeight: 600 }}>{t[0]}</span>
                    <span className="w-grow w-faint">{t[1]}</span>
                    <span className="w-faint" style={{ fontSize: 11 }}>★</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="w-card" style={{ padding: 12 }}>
              <h2 className="w-h2" style={{ marginBottom: 8 }}>태그</h2>
              <div className="w-rule" style={{ marginBottom: 8 }} />
              <div className="w-row" style={{ gap: 4, flexWrap: 'wrap' }}>
                {['금리','부동산','가계부채','물가','연준','환율','DSR'].map(t => (
                  <span key={t} className="w-tag" style={{ fontSize: 10 }}>#{t}</span>
                ))}
              </div>
            </div>

            {/* Related reports */}
            <div className="w-card" style={{ padding: 12 }}>
              <h2 className="w-h2" style={{ marginBottom: 8 }}>관련 리포트</h2>
              <div className="w-rule" style={{ marginBottom: 8 }} />
              <div className="w-col" style={{ gap: 8, fontSize: 11 }}>
                {[
                  ['KDI · 경제전망 25H2', '2025.11.05'],
                  ['BOK이슈노트 · 가계부채', '2025.10.18'],
                  ['IMF · WEO Oct 2025', '2025.10.15'],
                ].map((r,i) => (
                  <div key={i} className="w-row" style={{ gap: 8, padding: '4px 0', borderBottom: i < 2 ? `1px solid ${W.hairline}` : 'none' }}>
                    <div className="w-grow">
                      <div style={{ fontWeight: 500 }}>{r[0]}</div>
                      <div className="w-faint w-mono" style={{ fontSize: 9 }}>{r[1]}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* My memo */}
            <div className="w-card" style={{ padding: 12 }}>
              <h2 className="w-h2" style={{ marginBottom: 8 }}>내 메모</h2>
              <div className="w-rule" style={{ marginBottom: 8 }} />
              <div style={{ minHeight: 80, padding: 8, border: `1px dashed ${W.line}`, fontSize: 11, color: W.faint, fontStyle: 'italic' }}>
                메모 작성 — 인용·하이라이트·내 생각 기록
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.WireMasters = WireMasters;
window.WireReports = WireReports;
window.WireLearn = WireLearn;
window.WireReportDetail = WireReportDetail;
