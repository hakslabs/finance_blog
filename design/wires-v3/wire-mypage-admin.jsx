// My Page hub · Account Settings · Transactions · Admin Dashboard
// All four wires in one file — they share patterns (settings forms, list+detail, CRUD tables).

// ─────────────────────────────────────────────────────────────
// Shared local helpers
// ─────────────────────────────────────────────────────────────
function SidePanel({ active, items }) {
  return (
    <div className="w-col" style={{ width: 200, borderRight: `1px solid ${W.hairline}`, padding: 12, gap: 2, flexShrink: 0 }}>
      {items.map(it => (
        <div key={it} style={{
          padding: '7px 10px', fontSize: 12,
          background: it === active ? W.fill : 'transparent',
          fontWeight: it === active ? 600 : 400,
          borderLeft: it === active ? `2px solid ${W.ink}` : '2px solid transparent',
        }}>{it}</div>
      ))}
    </div>
  );
}

function FormRow({ label, hint, children }) {
  return (
    <div className="w-row" style={{ padding: '12px 0', borderBottom: `1px solid ${W.hairline}`, alignItems: 'flex-start', gap: 16 }}>
      <div style={{ width: 160, flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500 }}>{label}</div>
        {hint && <div className="w-faint" style={{ fontSize: 10.5, marginTop: 2 }}>{hint}</div>}
      </div>
      <div className="w-grow">{children}</div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
// 4. Admin Dashboard
// ─────────────────────────────────────────────────────────────
function WireAdmin() {
  const adminItems = ['대시보드', '고수 (Masters)', '13F 파싱', '학습 콘텐츠', '용어 사전', '뉴스 큐레이션', '사용자', 'API 사용량', '데이터 품질 / Cron', '공지사항'];
  const [item, setItem] = React.useState('대시보드');
  const Stub = ({ title, lines }) => (
    <div>
      <h1 className="w-h1" style={{ marginBottom: 14 }}>{title}</h1>
      <div className="w-card" style={{ padding: 16 }}>
        <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 className="w-h2">리스트</h2>
          <div className="w-row" style={{ gap: 6 }}>
            <input className="w-input" placeholder="검색" style={{ width: 200 }} />
            <button className="w-btn w-btn-primary">+ 새로 추가</button>
          </div>
        </div>
        <div className="w-rule" style={{ marginBottom: 8 }} />
        {lines.map((l, i) => (
          <div key={i} className="w-row" style={{ padding: '8px 0', borderBottom: `1px solid ${W.hairline}`, gap: 12, fontSize: 12 }}>
            <div className="w-grow" style={{ minWidth: 0 }}>{l[0]}</div>
            <span className="w-faint" style={{ fontSize: 10, width: 260, textAlign: 'right', flexShrink: 0 }}>{l[1]}</span>
            <span className="w-tag" style={{ color: l[3] || W.muted, borderColor: l[3] || W.muted, fontSize: 9.5, width: 90, textAlign: 'center', flexShrink: 0 }}>{l[2]}</span>
            <span className="w-faint" style={{ width: 80, textAlign: 'right', flexShrink: 0 }}>편집 · ⋯</span>
          </div>
        ))}
      </div>
    </div>
  );
  const ClickSide = () => (
    <div className="w-col" style={{ width: 200, borderRight: `1px solid ${W.hairline}`, padding: 12, gap: 2, flexShrink: 0 }}>
      {adminItems.map(it => (
        <div key={it} onClick={() => setItem(it)} style={{
          padding: '7px 10px', fontSize: 12, cursor: 'pointer',
          background: it === item ? W.fill : 'transparent',
          fontWeight: it === item ? 600 : 400,
          borderLeft: it === item ? `2px solid ${W.down}` : '2px solid transparent',
        }}>{it}</div>
      ))}
    </div>
  );
  return (
    <div className="w-root">
      {/* admin bar — visually distinct */}
      <div className="w-row" style={{ height: 48, borderBottom: `2px solid ${W.down}`, padding: '0 16px', gap: 16, flexShrink: 0, background: '#fdf3f3' }}>
        <div className="w-row" style={{ gap: 8 }}>
          <div style={{ width: 18, height: 18, border: `1.5px solid ${W.down}`, transform: 'rotate(45deg)' }} />
          <div style={{ fontWeight: 700, fontSize: 14, color: W.down }}>STOCKLAB · ADMIN</div>
        </div>
        <div className="w-grow" />
        <span className="w-pill" style={{ borderColor: W.down, color: W.down }}>관리자 모드</span>
        <span className="w-faint" style={{ fontSize: 11 }}>app.stocklab.io/admin</span>
        <div style={{ width: 28, height: 28, border: `1px solid ${W.hairline}`, borderRadius: '50%' }} />
      </div>
      <div className="w-row" style={{ flex: 1, overflow: 'hidden', alignItems: 'stretch' }}>
        <ClickSide />
        <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
          {item === '대시보드' && (<>
          <h1 className="w-h1" style={{ marginBottom: 14 }}>관리자 대시보드</h1>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            {[
              ['활성 사용자 (DAU)', '1,284'],
              ['신규 가입 (7일)', '+182'],
              ['오늘 API 호출', '38,420 / 60K'],
              ['Cron 실패', '2', W.down],
            ].map(([l, v, c]) => (
              <div key={l} className="w-card" style={{ padding: 12 }}>
                <div className="w-h3" style={{ fontSize: 10 }}>{l}</div>
                <div className="w-num-md" style={{ fontSize: 22, marginTop: 4, color: c || W.ink }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Two-column: Masters CRUD + Learn CRUD */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="w-card" style={{ padding: 12 }}>
              <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <h2 className="w-h2">고수 (Masters)</h2>
                <button className="w-btn">+ 새 고수</button>
              </div>
              <div className="w-rule" style={{ marginBottom: 6 }} />
              {[
                ['Warren Buffett', '13F 자동 · 14d 전 갱신', '활성'],
                ['Peter Lynch', '수동 입력 · 분기별', '활성'],
                ['Ray Dalio', '13F 자동 · 14d 전 갱신', '활성'],
                ['Cathie Wood', '13F 자동 · 1d 전 갱신', '활성'],
                ['Michael Burry', '13F 자동 · 84d 전 갱신', '주의', W.down],
                ['Charlie Munger', '수동 (히스토리)', '비활성', W.muted],
              ].map(([n, s, st, c]) => (
                <div key={n} className="w-row" style={{ padding: '7px 0', borderBottom: `1px solid ${W.hairline}`, gap: 10, fontSize: 11.5 }}>
                  <div style={{ width: 24, height: 24, border: `1px solid ${W.hairline}`, borderRadius: '50%' }} />
                  <div className="w-grow">
                    <div style={{ fontWeight: 600 }}>{n}</div>
                    <div className="w-faint" style={{ fontSize: 10 }}>{s}</div>
                  </div>
                  <span className="w-tag" style={{ color: c || W.up, borderColor: c || W.up }}>{st}</span>
                  <span className="w-faint">편집 ·  ⋯</span>
                </div>
              ))}
            </div>
            <div className="w-card" style={{ padding: 12 }}>
              <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <h2 className="w-h2">학습 콘텐츠</h2>
                <button className="w-btn">+ 새 글</button>
              </div>
              <div className="w-rule" style={{ marginBottom: 6 }} />
              <div className="w-row" style={{ gap: 4, marginBottom: 8 }}>
                {['전체', '발행됨', '초안', '비공개'].map((t, i) => (
                  <span key={t} className="w-pill" style={{ background: i === 0 ? W.fill : W.bg }}>{t}</span>
                ))}
              </div>
              {[
                ['재무제표 읽는 법 1편', '발행', '2026-05-01'],
                ['PER vs PBR 차이', '발행', '2026-04-22'],
                ['DCF 입문', '발행', '2026-04-10'],
                ['퀀트 팩터 가이드', '초안', '2026-05-04'],
                ['공포·탐욕 지수란', '발행', '2026-03-28'],
                ['ROE 분해 (DuPont)', '비공개', '2026-02-14'],
              ].map(([t, st, d], i) => (
                <div key={i} className="w-row" style={{ padding: '7px 0', borderBottom: `1px solid ${W.hairline}`, gap: 10, fontSize: 11.5 }}>
                  <div className="w-grow">{t}</div>
                  <span className="w-tag" style={{ fontSize: 9 }}>{st}</span>
                  <div className="w-mono w-faint" style={{ fontSize: 10, width: 80, textAlign: 'right' }}>{d}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Cron + API monitor */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
            <div className="w-card" style={{ padding: 12 }}>
              <h2 className="w-h2" style={{ marginBottom: 8 }}>Cron 작업 / 데이터 품질</h2>
              <div className="w-rule" style={{ marginBottom: 6 }} />
              {[
                ['시세 갱신 (5분)',     '12분 전', '✓', W.up],
                ['지수 갱신 (15분)',    '5분 전',  '✓', W.up],
                ['뉴스 수집 (30분)',    '12분 전', '✓', W.up],
                ['재무 갱신 (일 1회)',  '오늘 03:00', '✓', W.up],
                ['13F 분기 파싱',       '14일 전',  '✓', W.up],
                ['Fear & Greed 스크랩', '4시간 전', '⚠ 재시도', W.down],
              ].map(([n, t, s, c]) => (
                <div key={n} className="w-row" style={{ padding: '6px 0', borderBottom: `1px solid ${W.hairline}`, fontSize: 11.5 }}>
                  <div className="w-grow">{n}</div>
                  <div className="w-faint" style={{ width: 100, textAlign: 'right' }}>{t}</div>
                  <div className="w-mono" style={{ width: 80, textAlign: 'right', color: c }}>{s}</div>
                </div>
              ))}
            </div>
            <div className="w-card" style={{ padding: 12 }}>
              <h2 className="w-h2" style={{ marginBottom: 8 }}>외부 API 사용량</h2>
              <div className="w-rule" style={{ marginBottom: 6 }} />
              {[
                ['Finnhub',       '38,420 / 60K (분당)', 0.64],
                ['Alpha Vantage', '12 / 25 (일)',         0.48],
                ['DART',          '1,420 / 10K (일)',     0.14],
                ['SEC EDGAR',     '무제한',                0.05],
                ['NewsAPI',       '78 / 100 (일)',        0.78, W.down],
                ['FRED',          '무제한',                0.02],
              ].map(([n, v, p, c]) => (
                <div key={n} style={{ padding: '6px 0', borderBottom: `1px solid ${W.hairline}` }}>
                  <div className="w-row" style={{ fontSize: 11.5 }}>
                    <div className="w-grow">{n}</div>
                    <div className="w-faint w-mono" style={{ fontSize: 10 }}>{v}</div>
                  </div>
                  <div style={{ marginTop: 4, height: 4, background: W.fill, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${p * 100}%`, height: '100%', background: c || W.ink }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>)}
          {item === '고수 (Masters)' && <Stub title="고수 (Masters)" lines={[
            ['Warren Buffett', '13F 자동 · 14d 전 갱신', '활성', W.up],
            ['Peter Lynch', '수동 입력 · 분기별', '활성', W.up],
            ['Ray Dalio', '13F 자동 · 14d 전 갱신', '활성', W.up],
            ['Cathie Wood', '13F 자동 · 1d 전 갱신', '활성', W.up],
            ['Michael Burry', '13F 자동 · 84d 전 — 새 13F 미반영', '주의', W.down],
            ['Charlie Munger', '수동 (히스토리)', '비활성', W.muted],
          ]} />}
          {item === '13F 파싱' && <Stub title="13F 파싱" lines={[
            ['Q1 2026 · Berkshire Hathaway', '14일 전 · 자동', '완료', W.up],
            ['Q1 2026 · Bridgewater', '12일 전 · 자동', '완료', W.up],
            ['Q1 2026 · Scion (M. Burry)', '4일 전 · 수동 보정 대기', '주의', W.down],
            ['Q1 2026 · ARK Investment', '1일 전 · 자동', '완료', W.up],
            ['Q4 2025 · 일괄 재파싱', '진행 중 · 4 / 12', '진행', W.accent],
          ]} />}
          {item === '학습 콘텐츠' && <Stub title="학습 콘텐츠" lines={[
            ['재무제표 읽는 법 1편', '2026-05-01', '발행', W.up],
            ['PER vs PBR 차이', '2026-04-22', '발행', W.up],
            ['DCF 입문', '2026-04-10', '발행', W.up],
            ['퀀트 팩터 가이드', '2026-05-04', '초안', W.muted],
            ['공포·탐욕 지수란', '2026-03-28', '발행', W.up],
            ['ROE 분해 (DuPont)', '2026-02-14', '비공개', W.muted],
          ]} />}
          {item === '용어 사전' && <Stub title="용어 사전" lines={[
            ['PER (주가수익비율)', '레벨 입문 · 8문단', '발행', W.up],
            ['ROE (자기자본이익률)', '레벨 입문 · 5문단', '발행', W.up],
            ['DCF (현금흐름할인)', '레벨 중급 · 14문단', '발행', W.up],
            ['베타', '레벨 중급 · 6문단', '초안', W.muted],
            ['EV / EBITDA', '레벨 중급 · 9문단', '발행', W.up],
            ['Free Cash Flow', '레벨 입문 · 7문단', '발행', W.up],
          ]} />}
          {item === '뉴스 큐레이션' && <Stub title="뉴스 큐레이션" lines={[
            ['삼성전자 외인 순매수 8일 연속', '한경 · 34분 전', '핀', W.accent],
            ['NVDA 실적 가이던스 상향', 'Reuters · 2h 전', '핀', W.accent],
            ['연준 5월 FOMC 의사록 공개', 'WSJ · 1d 전', '검토', W.muted],
            ['SOXL 변동성 확대 분석', 'Bloomberg · 1d 전', '핀', W.accent],
            ['Berkshire 신규 편입 종목 공개', 'CNBC · 3d 전', '검토', W.muted],
          ]} />}
          {item === '사용자' && <Stub title="사용자 관리" lines={[
            ['홍길동 · hong@example.com', '일반 · 가입 21개월', '활성', W.up],
            ['김민준 · minjun@example.com', '일반 · 가입 8개월', '활성', W.up],
            ['이서연 · seo@example.com', '일반 · 가입 3개월', '활성', W.up],
            ['박지호 · jiho@example.com', '운영자 · 가입 14개월', '관리자', W.down],
            ['최유나 · yuna@example.com', '일반 · 가입 26개월', '휴면', W.muted],
          ]} />}
          {item === 'API 사용량' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h1 className="w-h1">API 한도 · Cron 검증</h1>
              <div className="w-faint" style={{ fontSize: 11 }}>2025-12 기준 무료 티어. 모든 호출은 Supabase에 캐시 저장 후 사용자에게 서빙.</div>
              <WireApiBudgetTable />
            </div>
          )}
          {item === '데이터 품질 / Cron' && <Stub title="데이터 품질 / Cron 로그" lines={[
            ['시세 갱신 (5분)', '12분 전', '✓ 정상', W.up],
            ['지수 갱신 (15분)', '5분 전', '✓ 정상', W.up],
            ['뉴스 수집 (30분)', '12분 전', '✓ 정상', W.up],
            ['재무 갱신 (일 1회)', '오늘 03:00', '✓ 정상', W.up],
            ['13F 분기 파싱', '14일 전', '✓ 정상', W.up],
            ['Fear & Greed 스크랩', '4시간 전', '⚠ 재시도 2', W.down],
          ]} />}
          {item === '공지사항' && <Stub title="공지사항" lines={[
            ['v3 출시 — 마이페이지 · Thesis 도입', '2026-05-10', '발행', W.up],
            ['휴면 계정 정책 안내', '2026-04-15', '발행', W.up],
            ['약관 개정 (개인정보 처리방침)', '2026-03-28', '발행', W.up],
            ['신규 데이터 소스 — DART 연동', '2026-03-12', '발행', W.up],
            ['모바일 베타 모집', '2026-02-20', '발행', W.up],
          ]} />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Unified My Page — 3 tabs in one page (마이페이지 / 거래 내역 / 계정 설정)
// ─────────────────────────────────────────────────────────────
function WireMyPageAll() {
  const [tab, setTab] = React.useState('마이페이지');
  const tabs = ['마이페이지', '거래 내역', '계정 설정'];

  // Inner sub-state: which side-panel item is active inside each tab
  const [hubItem, setHubItem] = React.useState('개요');
  const [setItem, setSetItem] = React.useState('프로필');

  const hubItems = ['개요', '내 포지션 · Thesis', '내 메모/일지', '내 관심종목', '팔로우한 고수', '북마크 용어', '저장한 검색조건', '활동 기록'];
  const setItems = ['프로필', '투자 성향', '비밀번호', '연결된 소셜', '시장 / 통화', '언어 / 타임존', '테마', '알림 설정', '데이터 내보내기', '회원 탈퇴'];

  // Clickable side panel
  const ClickSidePanel = ({ active, items, onPick }) => (
    <div className="w-col" style={{ width: 200, borderRight: `1px solid ${W.hairline}`, padding: 12, gap: 2, flexShrink: 0 }}>
      {items.map(it => (
        <div key={it} onClick={() => onPick(it)} style={{
          padding: '7px 10px', fontSize: 12, cursor: 'pointer',
          background: it === active ? W.fill : 'transparent',
          fontWeight: it === active ? 600 : 400,
          borderLeft: it === active ? `2px solid ${W.ink}` : '2px solid transparent',
        }}>{it}</div>
      ))}
    </div>
  );

  // ── Hub body
  const HubBody = () => (
    <div className="w-row" style={{ flex: 1, overflow: 'hidden', alignItems: 'stretch' }}>
      <ClickSidePanel active={hubItem} items={hubItems} onPick={setHubItem} />
      <div style={{ flex: 1, padding: '14px 20px', overflow: 'auto' }}>
        {/* Compact identity strip — single line, top-aligned */}
        <div className="w-row" style={{ gap: 10, padding: '6px 0 10px', borderBottom: `1px solid ${W.hairline}`, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, border: `1px solid ${W.line}`, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ fontWeight: 600, fontSize: 13 }}>홍길동</div>
          <span className="w-faint" style={{ fontSize: 11 }}>hong@example.com · 일반회원 · 가입 21개월차</span>
          <div className="w-grow" />
          <span className="w-faint w-mono" style={{ fontSize: 10 }}>마지막 활동 12분 전</span>
          <button className="w-btn" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setTab('계정 설정')}>계정 설정 →</button>
        </div>

        {hubItem === '개요' && (
          <div>
            {/* Dense KPI strip — 6 cols, top */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0, border: `1px solid ${W.line}`, marginBottom: 12 }}>
              {[
                { l: '보유 포지션', v: '12', s: 'Thesis 12/12', k: '내 포지션 · Thesis' },
                { l: '반응 메모 필요', v: '3', s: '±10% 알람', k: '내 포지션 · Thesis', warn: true },
                { l: '작성한 메모', v: '128', s: '종목·뉴스·거래·학습', k: '내 메모/일지' },
                { l: '관심종목', v: '24', s: '3개 리스트', k: '내 관심종목' },
                { l: '저장한 검색', v: '7', s: '신규 편입 +3', k: '저장한 검색조건' },
                { l: '팔로우 고수', v: '5', s: 'Buffett 외', k: '팔로우한 고수' },
              ].map((c, i, a) => (
                <div key={c.l} style={{
                  padding: '8px 12px', cursor: 'pointer',
                  borderRight: i < a.length - 1 ? `1px solid ${W.hairline}` : 'none',
                  background: c.warn ? 'rgba(211,65,65,0.05)' : 'transparent',
                }} onClick={() => setHubItem(c.k)}>
                  <div className="w-h3" style={{ fontSize: 9.5 }}>{c.l}</div>
                  <div className="w-num-md" style={{ fontSize: 18, marginTop: 2, color: c.warn ? W.down : W.ink }}>{c.v}</div>
                  <div className="w-faint" style={{ fontSize: 9.5, marginTop: 1, lineHeight: 1.3 }}>{c.s}</div>
                </div>
              ))}
            </div>

            {/* Today's TODO */}
            <div className="w-card" style={{ padding: 0, marginBottom: 12, borderColor: W.accent }}>
              <div className="w-row" style={{ justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${W.hairline}`, background: 'rgba(42,111,219,0.05)' }}>
                <h2 className="w-h2" style={{ color: W.accent }}>오늘 할 일</h2>
                <span className="w-faint" style={{ fontSize: 10 }}>완료 1 / 5 · 대시보드와 동기</span>
              </div>
              {[
                { done: true,  t: 'NVDA 실적 발표 전 메모 업데이트',  cat: '종목', meta: 'D-1' },
                { done: false, t: 'SOXL -12% 도달 — 매도/추가매수 판단 메모 작성',        cat: '반응', meta: '알람' },
                { done: false, t: '삼성전자 외인 순매수 이유 확인',        cat: '뉴스', meta: '34분 전' },
                { done: false, t: 'AAPL 배당락 전 포지션 점검',        cat: '이벤트', meta: 'D-2' },
                { done: false, t: 'RSI 과매수 종목 2개 검토',             cat: '신호', meta: '관심종목' },
              ].map((todo, i, arr) => (
                <div key={i} className="w-row" style={{
                  padding: '8px 12px', gap: 10, fontSize: 11.5,
                  borderBottom: i < arr.length - 1 ? `1px solid ${W.hairline}` : 'none',
                  background: todo.done ? W.fill : 'transparent',
                }}>
                  <span className="w-checkbox" style={{ background: todo.done ? W.ink : W.bg, flexShrink: 0 }} />
                  <div className="w-grow" style={{ textDecoration: todo.done ? 'line-through' : 'none', color: todo.done ? W.muted : W.ink }}>{todo.t}</div>
                  <span className="w-tag" style={{ fontSize: 9, color: W.muted, borderColor: W.hairline }}>{todo.cat}</span>
                  <span className="w-faint w-mono" style={{ fontSize: 10, width: 90, textAlign: 'right' }}>{todo.meta}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="w-card" style={{ padding: 12 }}>
                <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                  <h2 className="w-h2">관심종목 리스트</h2>
                  <span className="w-pill" style={{ borderStyle: 'dashed' }}>+ 새 리스트</span>
                </div>
                <div className="w-rule" style={{ marginBottom: 6 }} />
                {[
                  { n: '기본', c: 8, p: '+1.2%' },
                  { n: '미국주', c: 7, p: '+2.4%' },
                  { n: '배당주', c: 5, p: '+0.8%' },
                  { n: 'AI 테마', c: 4, p: '+5.1%' },
                ].map(l => (
                  <div key={l.n} className="w-row" style={{ padding: '8px 0', borderBottom: `1px solid ${W.hairline}`, gap: 10 }}>
                    <div className="w-grow" style={{ fontSize: 12 }}>{l.n}</div>
                    <div className="w-faint" style={{ fontSize: 11 }}>{l.c}개</div>
                    <div className="w-up w-mono" style={{ fontSize: 11, width: 50, textAlign: 'right' }}>{l.p}</div>
                    <span className="w-faint">⋯</span>
                  </div>
                ))}
              </div>
              <div className="w-card" style={{ padding: 12 }}>
                <h2 className="w-h2" style={{ marginBottom: 8 }}>최근 활동</h2>
                <div className="w-rule" style={{ marginBottom: 6 }} />
                {[
                  ['관심종목 추가', 'NVDA · 2시간 전'],
                  ['고수 팔로우', 'Peter Lynch · 어제'],
                  ['용어 북마크', 'Free Cash Flow · 어제'],
                  ['검색 저장', '저PER 고ROE · 3일 전'],
                  ['거래 입력', 'AAPL 매수 10주 · 5일 전'],
                ].map(([a, t]) => (
                  <div key={t} className="w-row" style={{ padding: '7px 0', borderBottom: `1px solid ${W.hairline}`, fontSize: 11.5 }}>
                    <div className="w-grow">{a}</div>
                    <div className="w-faint">{t}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {hubItem === '내 관심종목' && (
          <div>
            <h2 className="w-h2" style={{ marginBottom: 12 }}>내 관심종목 · 24개 / 3개 리스트</h2>
            <div className="w-row" style={{ gap: 6, marginBottom: 12, alignItems: 'baseline' }}>
              {['기본 (8)','미국주 (7)','배당주 (5)','AI 테마 (4)','+ 새 리스트'].map((t,i) => (
                <span key={t} className="w-pill" style={{ background: i === 0 ? W.fill : W.bg, borderStyle: i === 4 ? 'dashed' : 'solid' }}>{t}</span>
              ))}
              <div className="w-grow" />
              <span className="w-faint" style={{ fontSize: 10 }}>메모 12 · 알림 3 · 실적 임박 1</span>
            </div>
            <div className="w-card" style={{ padding: 0 }}>
              <div className="w-row" style={{ padding: '8px 12px', background: W.fill, fontSize: 10.5, fontWeight: 600, borderBottom: `1px solid ${W.line}` }}>
                <div style={{ width: 90 }}>티커</div><div className="w-grow">종목명</div>
                <div style={{ width: 80, textAlign: 'right' }}>현재가</div>
                <div style={{ width: 60, textAlign: 'right' }}>등락</div>
                <div style={{ width: 56, textAlign: 'center' }}>메모</div>
                <div style={{ width: 56, textAlign: 'center' }}>알림</div>
                <div style={{ width: 90 }}>다음 이벤트</div>
                <div style={{ width: 70, textAlign: 'right' }}>검토일</div>
                <div style={{ width: 70, textAlign: 'center' }}>상태</div>
              </div>
              {[
                { tk: 'AAPL',   nm: 'Apple Inc.',    px: '$229.41', chg: '+0.42%', cc: W.up,   memo: 4, alert: 1, evt: '배당락 D-2', last: '3일 전',  status: '보유',   sc: W.up },
                { tk: 'NVDA',   nm: 'NVIDIA Corp.',  px: '$912.18', chg: '+3.42%', cc: W.up,   memo: 9, alert: 2, evt: '실적 D-1',   last: '오늘',     status: '검토',     sc: W.accent },
                { tk: 'MSFT',   nm: 'Microsoft',     px: '$402.18', chg: '+0.18%', cc: W.up,   memo: 0, alert: 0, evt: '—',          last: '24일 전', status: '관찰',    sc: W.muted },
                { tk: '005930', nm: '삼성전자',   px: '55,400',  chg: '+0.36%', cc: W.up,   memo: 6, alert: 1, evt: '잠정실적 D-16', last: '7일 전',  status: '보유',   sc: W.up },
                { tk: '000660', nm: 'SK하이닉스',  px: '148,300', chg: '−1.20%', cc: W.down, memo: 2, alert: 0, evt: '—',          last: '12일 전', status: '후보',   sc: W.accent },
                { tk: 'TSLA',   nm: 'Tesla',         px: '$378.40', chg: '+3.40%', cc: W.up,   memo: 3, alert: 0, evt: '—',          last: '38일 전', status: '제외 검토', sc: W.down },
              ].map((r,i,arr) => (
                <div key={i} className="w-row" style={{ padding: '8px 12px', fontSize: 11, borderBottom: i < arr.length - 1 ? `1px solid ${W.hairline}` : 'none' }}>
                  <div className="w-mono" style={{ width: 90, fontWeight: 600 }}>{r.tk}</div>
                  <div className="w-grow">{r.nm}</div>
                  <div className="w-mono" style={{ width: 80, textAlign: 'right' }}>{r.px}</div>
                  <div className="w-mono" style={{ width: 60, textAlign: 'right', color: r.cc }}>{r.chg}</div>
                  <div style={{ width: 56, textAlign: 'center', fontSize: 10 }}>
                    {r.memo > 0 ? <span style={{ color: W.accent, fontWeight: 600 }}>✎ {r.memo}</span> : <span className="w-faint">—</span>}
                  </div>
                  <div style={{ width: 56, textAlign: 'center', fontSize: 10 }}>
                    {r.alert > 0 ? <span style={{ color: W.ink }}>🔔 {r.alert}</span> : <span className="w-faint">—</span>}
                  </div>
                  <div className="w-faint" style={{ width: 90, fontSize: 10 }}>{r.evt}</div>
                  <div className="w-faint w-mono" style={{ width: 70, textAlign: 'right', fontSize: 10 }}>{r.last}</div>
                  <div style={{ width: 70, textAlign: 'center' }}>
                    <span className="w-tag" style={{ color: r.sc, borderColor: r.sc, fontSize: 9 }}>{r.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {hubItem === '팔로우한 고수' && (
          <div>
            <h2 className="w-h2" style={{ marginBottom: 12 }}>팔로우한 고수 · 5명</h2>
            <div className="w-col" style={{ gap: 8 }}>
              {[
                ['Warren Buffett', 'Berkshire Hathaway', '46개 종목 보유 · 13F 14일 전 갱신'],
                ['Peter Lynch', 'Fidelity (히스토리)', '수동 입력 · 분기별'],
                ['Ray Dalio', 'Bridgewater', '124개 종목 · 13F 14일 전 갱신'],
                ['Cathie Wood', 'ARK Invest', '38개 종목 · 1일 전 갱신'],
                ['Stanley Druckenmiller', 'Duquesne', '22개 종목 · 14일 전 갱신'],
              ].map(([n,f,d],i) => (
                <div key={i} className="w-card" style={{ padding: 12 }}>
                  <div className="w-row" style={{ gap: 10 }}>
                    <div style={{ width: 40, height: 40, border: `1px solid ${W.line}`, borderRadius: '50%', flexShrink: 0 }} />
                    <div className="w-grow">
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{n}</div>
                      <div className="w-faint" style={{ fontSize: 11 }}>{f}</div>
                      <div className="w-faint" style={{ fontSize: 10, marginTop: 2 }}>{d}</div>
                    </div>
                    <button className="w-btn">팔로우 해제</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {hubItem === '북마크 용어' && (
          <div>
            <h2 className="w-h2" style={{ marginBottom: 12 }}>북마크 용어 · 18개</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {[
                ['Free Cash Flow', '재무', '영업현금흐름에서 자본적 지출(CapEx)을 뺀 값.'],
                ['PER', '재무', '주가를 주당순이익(EPS)으로 나눈 배수. 시장의 기대치를 측정.'],
                ['PBR', '재무', '주가를 주당순자산(BPS)으로 나눈 배수. 자산 대비 평가.'],
                ['ROE', '재무', '자기자본이익률. 순이익을 자본으로 나눈 비율.'],
                ['골든크로스', '기술', '단기 이평선이 장기 이평선을 상향 돌파하는 강세 신호.'],
                ['RSI', '기술', '상대강도지수. 0~100, 30 이하 과매도·70 이상 과매수.'],
              ].map(([t,c,d],i) => (
                <div key={i} className="w-card" style={{ padding: 12 }}>
                  <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{t}</span>
                    <span className="w-tag">{c}</span>
                  </div>
                  <div className="w-faint" style={{ fontSize: 11, lineHeight: 1.5 }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {hubItem === '저장한 검색조건' && (
          <div>
            <div className="w-row" style={{ marginBottom: 12, gap: 10 }}>
              <h2 className="w-h2 w-grow">저장한 검색조건 <span className="w-faint" style={{ fontSize: 11, fontWeight: 400 }}>· 7개 · 자동 실행 + 명세 추적</span></h2>
              <button className="w-btn">+ 새 조건</button>
            </div>
            <div className="w-col" style={{ gap: 8 }}>
              {[
                { n: '저PER 고ROE', c: 'PER ≤ 15 · ROE ≥ 15% · 시총 ≥ 1조', y: 12, today: 15, freq: '매일', inn: ['현대차','기아','하나금융지주'], out: [] },
                { n: '배당 성장주', c: '배당수익률 ≥ 2% · 5Y 배당성장 ≥ 8%', y: 18, today: 18, freq: '매일', inn: [], out: [] },
                { n: 'AI 테마 모멘텀', c: '섹터 IT · YTD ≥ +30% · RSI 50-70', y: 16, today: 14, freq: '매일', inn: ['SK하이닉스'], out: ['TSM','AMD','삼성SDI'] },
                { n: '52주 신고가 돌파', c: '신고가 - 5% 이내 · 거래량 1.5x', y: 24, today: 28, freq: '15분', inn: ['NVDA','META','BRK.B','MS'], out: [] },
              ].map((s,i) => {
                const diff = s.today - s.y;
                return (
                  <div key={i} className="w-card" style={{ padding: 12 }}>
                    <div className="w-row" style={{ marginBottom: 4, gap: 8, alignItems: 'baseline' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{s.n}</div>
                      <div className="w-grow" />
                      <span className="w-mono w-faint" style={{ fontSize: 10.5 }}>어제 {s.y} → 오늘 <b style={{ color: W.ink }}>{s.today}</b> <span style={{ color: diff > 0 ? W.up : diff < 0 ? W.down : W.muted }}>({diff > 0 ? '+' : ''}{diff})</span></span>
                      <span className="w-pill" style={{ fontSize: 9 }}>{s.freq} 자동 실행</span>
                    </div>
                    <div className="w-faint w-mono" style={{ fontSize: 10.5, marginBottom: 8 }}>{s.c}</div>
                    {s.inn.length > 0 && (
                      <div className="w-row" style={{ gap: 4, marginBottom: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="w-faint" style={{ fontSize: 10, color: W.up }}>+ 신규 편입:</span>
                        {s.inn.map(t => <span key={t} className="w-tag" style={{ color: W.up, borderColor: W.up, fontSize: 9.5 }}>{t}</span>)}
                        <span className="w-faint" style={{ fontSize: 9.5, marginLeft: 6, cursor: 'pointer', color: W.accent }}>관심종목 추가 →</span>
                      </div>
                    )}
                    {s.out.length > 0 && (
                      <div className="w-row" style={{ gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="w-faint" style={{ fontSize: 10, color: W.down }}>− 제외:</span>
                        {s.out.map(t => <span key={t} className="w-tag" style={{ color: W.down, borderColor: W.down, fontSize: 9.5 }}>{t}</span>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {hubItem === '내 메모/일지' && (
          <div>
            <div className="w-row" style={{ marginBottom: 12, gap: 10 }}>
              <h2 className="w-h2 w-grow">내 메모 / 일지 <span className="w-faint" style={{ fontSize: 11, fontWeight: 400 }}>· 128개</span></h2>
              <button className="w-btn w-btn-primary">+ 새 메모</button>
            </div>
            {/* Type filter */}
            <div className="w-row" style={{ gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {[['전체', 128, true], ['종목', 64], ['뉴스', 32], ['거래', 22], ['학습', 10]].map(([t,n,a],i) => (
                <span key={i} className="w-pill" style={{ background: a ? W.fill : W.bg, fontWeight: a ? 600 : 400 }}>{t} {n}</span>
              ))}
              <div className="w-grow" />
              <input className="w-input" placeholder="종목 · 태그 · 날짜" style={{ width: 220 }} />
            </div>
            {/* Tag chips */}
            <div className="w-row" style={{ gap: 4, marginBottom: 12, flexWrap: 'wrap', fontSize: 10 }}>
              <span className="w-faint" style={{ fontSize: 10, marginRight: 4 }}>자주 쓰는 태그:</span>
              {['#AI','#반도체','#실적','#환율','#고평가','#실수복기','#의료기기','#배당'].map(t => (
                <span key={t} className="w-tag" style={{ color: W.muted, fontSize: 9.5 }}>{t}</span>
              ))}
            </div>
            <div className="w-col" style={{ gap: 8 }}>
              {[
                { type: '종목', tk: 'NVDA',   d: '2026-05-11', t: 'AI 추론 칩 발표 후 단기 모멘텀은 강하지만, 밸류에이션 부담이 커서 추가 매수는 실적 가이던스 확인 후 판단.', tags: ['#AI','#실적','#고평가'], links: '뉴스 1 · 거래 1 · 리포트 2' },
                { type: '거래', tk: 'SOXL',  d: '2026-05-10', t: '일부 익절 이후 다시 추격매수하다 손절. 뉴스에 과민반응 행동. 다음엔 원칙 재확인 후 진입.', tags: ['#실수복기','#추격매수'], links: '거래 1' },
                { type: '뉴스', tk: null,    d: '2026-05-09', t: '연준이 인하 시그널 남긴 건 일시적 안도. 단 고용 지표에 따라 다시 돌볼 수 있으므로 과장 금물 이탈은 주의.', tags: ['#금리','#매크로'], links: '뉴스 1 · 리포트 1' },
                { type: '학습', tk: 'FCF',   d: '2026-05-07', t: 'FCF = 영업현금흐름 - CapEx. NVDA 같은 고성장주는 CapEx 풍적이 커서 FCF가 일시적으로 마이너스일 수 있다.', tags: ['#재무','#FCF'], links: '용어 1' },
              ].map((m,i) => (
                <div key={i} className="w-card" style={{ padding: 12 }}>
                  <div className="w-row" style={{ marginBottom: 4, gap: 8, alignItems: 'baseline' }}>
                    <span className="w-tag" style={{ fontSize: 9, color: W.accent, borderColor: W.accent }}>{m.type}</span>
                    {m.tk && <span className="w-mono" style={{ fontWeight: 600 }}>{m.tk}</span>}
                    <div className="w-grow" />
                    <span className="w-faint" style={{ fontSize: 10 }}>{m.d}</span>
                    <span className="w-faint" style={{ fontSize: 10 }}>⋯</span>
                  </div>
                  <div style={{ fontSize: 11.5, lineHeight: 1.55, color: W.ink }}>{m.t}</div>
                  <div className="w-row" style={{ marginTop: 6, gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                    {m.tags.map(t => (
                      <span key={t} className="w-tag" style={{ color: W.muted, fontSize: 9.5 }}>{t}</span>
                    ))}
                    <div className="w-grow" />
                    <span className="w-faint" style={{ fontSize: 9.5 }}>연결: {m.links}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {hubItem === '내 포지션 · Thesis' && (
          <div>
            <div className="w-row" style={{ marginBottom: 10, gap: 10 }}>
              <h2 className="w-h2 w-grow">내 포지션 · Thesis <span className="w-faint" style={{ fontSize: 11, fontWeight: 400 }}>· 매수 시점에 판단 근거를 잠그고, 가격이 움직이면 알람이 반응 메모를 요청합니다</span></h2>
              <button className="w-btn">포트폴리오 →</button>
              <button className="w-btn w-btn-primary">+ 신규 포지션 Thesis</button>
            </div>

            {/* Portfolio summary strip — ties this view to portfolio */}
            <div className="w-row" style={{ gap: 0, marginBottom: 12, border: `1px solid ${W.line}` }}>
              {[
                ['보유 종목', '12개'],
                ['평가액', '₩ 84.2M'],
                ['평가 손익', '+₩ 6.84M', W.up],
                ['오늘 손익', '+₩ 184,200', W.up],
                ['Thesis 작성률', '12 / 12', W.up],
                ['반응 메모 필요', '3건', W.down],
              ].map(([l, v, c], i, a) => (
                <div key={l} style={{ flex: 1, padding: '8px 12px', borderRight: i < a.length - 1 ? `1px solid ${W.hairline}` : 'none' }}>
                  <div className="w-h3" style={{ fontSize: 9.5 }}>{l}</div>
                  <div className="w-num-md" style={{ fontSize: 14, marginTop: 2, color: c || W.ink }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Filter */}
            <div className="w-row" style={{ gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {[['전체 보유', 12, true], ['반응 메모 미작성', 3, false, W.down], ['알람 임박 (5% 이내)', 2, false, W.accent], ['청산 검토', 1], ['종결 (매도 완료)', 18]].map(([t,n,a,c],i) => (
                <span key={i} className="w-pill" style={{
                  background: a ? W.fill : W.bg,
                  color: c || (a ? W.ink : W.muted),
                  borderColor: c || W.hairline,
                  fontWeight: a ? 600 : 400,
                }}>{t} {n}</span>
              ))}
              <div className="w-grow" />
              <input className="w-input" placeholder="티커 · 태그" style={{ width: 180 }} />
            </div>

            <div className="w-col" style={{ gap: 12 }}>
              {[
                {
                  tk: 'NVDA', nm: 'NVIDIA',
                  open: '2026-02-14', qty: 14, avg: '$612.40', curr: '$912.18', ret: '+48.9%', retUp: true, weight: '12.4%',
                  thesis: 'AI 추론 인프라 수요가 최소 2027년까지 CapEx 사이클을 지지. Blackwell 양산 일정 정상 + Hopper 재고 정리 완료. 데이터센터 매출 YoY +120% 이상 유지 가능.',
                  conditions: ['데이터센터 매출 ≥ +80% YoY', 'Gross Margin ≥ 70%', '경쟁사 추론 칩 출하 ≤ 5% MSS', 'PER ≤ 60'],
                  exitPlan: '-15% 손절 · +60% 부분 익절 · 데이터센터 성장률 50% 하회 시 청산',
                  alerts: [
                    { trig: '+30% 도달 (2026-04-02)', note: '실적 서프라이즈 + 가이던스 상향. CapEx 사이클 더 길어질 가능성. 추가 매수 보류, 비중 유지.', done: true },
                    { trig: '+48% 도달 (2026-05-08)', note: null, done: false, urgent: true },
                  ],
                  tags: ['#AI','#반도체','#장기'],
                },
                {
                  tk: 'AAPL', nm: 'Apple',
                  open: '2024-09-22', qty: 22, avg: '$172.10', curr: '$229.41', ret: '+33.3%', retUp: true, weight: '9.1%',
                  thesis: '서비스 매출 비중 25% 돌파 + 자사주 매입 연 1,000억$ 유지. 인도 시장 점진 침투. Vision Pro는 옵션, 본 thesis는 서비스+버받.',
                  conditions: ['서비스 매출 ≥ +12% YoY', '자사주 매입 ≥ $90B / yr', 'iPhone ASP 유지'],
                  exitPlan: '-10% 손절 · 서비스 성장 한 자릿수 둔화 시 청산',
                  alerts: [
                    { trig: '+20% 도달 (2025-04-12)', note: 'WWDC AI 발표 호재. 다만 thesis 외 요인. 트레이드 카운트 안 함.', done: true },
                    { trig: '+33% 도달 (2026-05-04)', note: '배당락 직전 단기 강세. thesis 그대로, 비중만 조절 안 함.', done: true },
                  ],
                  tags: ['#서비스','#장기','#배당'],
                },
                {
                  tk: 'SOXL', nm: 'Direxion Semis 3x',
                  open: '2026-05-10', qty: 30, avg: '$28.40', curr: '$25.00', ret: '-12.0%', retUp: false, weight: '1.8%',
                  thesis: '⚠ 매수 당시 thesis 미작성. 뉴스 헤드라인(반도체 강세 보도) 보고 추격매수.',
                  conditions: ['(없음 — 사후 기록 필요)'],
                  exitPlan: '(없음 — 청산 검토)',
                  alerts: [
                    { trig: '-10% 도달 (2026-05-11)', note: null, done: false, urgent: true },
                    { trig: '-12% 도달 (2026-05-11)', note: null, done: false, urgent: true },
                  ],
                  tags: ['#실수복기','#추격매수','#3x레버리지'],
                  warn: true,
                },
              ].map((p, i) => (
                <div key={i} className="w-card" style={{ padding: 0, borderColor: p.warn ? W.down : W.line }}>
                  {/* Header — position summary */}
                  <div className="w-row" style={{ padding: '10px 14px', gap: 12, borderBottom: `1px solid ${W.hairline}`, background: p.warn ? 'rgba(211,65,65,0.04)' : W.bg }}>
                    <span className="w-mono" style={{ fontWeight: 700, fontSize: 14 }}>{p.tk}</span>
                    <span className="w-faint" style={{ fontSize: 11 }}>{p.nm}</span>
                    <span className="w-faint w-mono" style={{ fontSize: 10 }}>편입 {p.open} · {p.qty}주 @ {p.avg}</span>
                    <div className="w-grow" />
                    <div className="w-col" style={{ alignItems: 'flex-end' }}>
                      <span className="w-mono" style={{ fontWeight: 600, fontSize: 12 }}>{p.curr}</span>
                      <span className={'w-mono ' + (p.retUp ? 'w-up' : 'w-down')} style={{ fontSize: 11 }}>{p.ret} · 비중 {p.weight}</span>
                    </div>
                  </div>

                  {/* Body: two-column — left=thesis (locked) · right=alert reaction log */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr' }}>
                    {/* Left: locked thesis */}
                    <div style={{ padding: 12, borderRight: `1px solid ${W.hairline}` }}>
                      <div className="w-row" style={{ gap: 6, marginBottom: 6, alignItems: 'baseline' }}>
                        <span className="w-h3" style={{ fontSize: 9.5 }}>매수 시점 Thesis</span>
                        <span className="w-tag" style={{ fontSize: 8.5, color: W.muted, borderColor: W.hairline }}>🔒 잠금 · 편입 시 고정</span>
                        <div className="w-grow" />
                        <span className="w-faint" style={{ fontSize: 9.5, cursor: 'pointer' }}>이력 보기</span>
                      </div>
                      <div style={{ fontSize: 11.5, lineHeight: 1.6, color: p.warn ? W.down : W.ink, marginBottom: 8 }}>{p.thesis}</div>

                      <div className="w-h3" style={{ fontSize: 9.5, marginBottom: 4 }}>판단 근거 · 조건 (당시 기록)</div>
                      <div className="w-col" style={{ gap: 2, marginBottom: 8 }}>
                        {p.conditions.map((c, j) => (
                          <div key={j} className="w-row" style={{ gap: 6, fontSize: 10.5 }}>
                            <span style={{ color: W.faint }}>▸</span>
                            <span style={{ color: p.warn ? W.muted : W.ink }}>{c}</span>
                          </div>
                        ))}
                      </div>

                      <div className="w-h3" style={{ fontSize: 9.5, marginBottom: 4 }}>청산 계획</div>
                      <div className="w-faint" style={{ fontSize: 10.5, marginBottom: 8, lineHeight: 1.5 }}>{p.exitPlan}</div>

                      <div className="w-row" style={{ gap: 4, flexWrap: 'wrap' }}>
                        {p.tags.map(t => (
                          <span key={t} className="w-tag" style={{ color: W.muted, fontSize: 9.5 }}>{t}</span>
                        ))}
                      </div>
                    </div>

                    {/* Right: alert-triggered reaction log */}
                    <div style={{ padding: 12 }}>
                      <div className="w-row" style={{ gap: 6, marginBottom: 6, alignItems: 'baseline' }}>
                        <span className="w-h3" style={{ fontSize: 9.5 }}>가격 반응 메모 · 알람 트리거</span>
                        <div className="w-grow" />
                        <span className="w-faint" style={{ fontSize: 9.5 }}>설정 ⋯</span>
                      </div>

                      {/* Alert thresholds — visual */}
                      <div style={{ padding: '6px 8px', background: W.fill, marginBottom: 8, fontSize: 9.5 }}>
                        <div className="w-row" style={{ gap: 4, color: W.muted }}>
                          <span>알람:</span>
                          <span className="w-tag" style={{ fontSize: 8.5, color: W.down, borderColor: W.down }}>±10%</span>
                          <span className="w-tag" style={{ fontSize: 8.5, color: W.down, borderColor: W.down }}>±20%</span>
                          <span className="w-tag" style={{ fontSize: 8.5, color: W.down, borderColor: W.down }}>±50%</span>
                          <span className="w-tag" style={{ fontSize: 8.5, color: W.accent, borderColor: W.accent }}>실적일</span>
                          <span className="w-tag" style={{ fontSize: 8.5, color: W.accent, borderColor: W.accent }}>주요 공시</span>
                        </div>
                      </div>

                      {/* Reaction log entries */}
                      <div className="w-col" style={{ gap: 6 }}>
                        {p.alerts.map((a, j) => (
                          <div key={j} style={{ padding: 8, borderLeft: `2px solid ${a.urgent ? W.down : (a.done ? W.up : W.hairline)}`, background: a.urgent ? 'rgba(211,65,65,0.06)' : (a.done ? 'transparent' : W.fill) }}>
                            <div className="w-row" style={{ gap: 6, marginBottom: 3, alignItems: 'baseline' }}>
                              <span className="w-mono" style={{ fontSize: 10.5, fontWeight: 600, color: a.urgent ? W.down : W.ink }}>{a.trig}</span>
                              <div className="w-grow" />
                              {a.done && <span className="w-tag" style={{ fontSize: 8.5, color: W.up, borderColor: W.up }}>작성됨</span>}
                              {a.urgent && <span className="w-tag" style={{ fontSize: 8.5, color: W.down, borderColor: W.down }}>반응 메모 필요</span>}
                            </div>
                            {a.note ? (
                              <div style={{ fontSize: 10.5, lineHeight: 1.5, color: W.ink }}>{a.note}</div>
                            ) : (
                              <div className="w-row" style={{ gap: 6, alignItems: 'center' }}>
                                <span className="w-faint" style={{ fontSize: 10 }}>왜 움직였다고 생각하나? thesis가 깨졌나?</span>
                                <button className="w-btn" style={{ padding: '3px 8px', fontSize: 10 }}>+ 메모 작성</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="w-row" style={{ marginTop: 8, gap: 6 }}>
                        <button className="w-btn" style={{ padding: '3px 8px', fontSize: 10 }}>thesis 수정</button>
                        <button className="w-btn" style={{ padding: '3px 8px', fontSize: 10 }}>알람 임계 변경</button>
                        <div className="w-grow" />
                        {p.warn && <button className="w-btn" style={{ padding: '3px 8px', fontSize: 10, color: W.down, borderColor: W.down }}>청산 검토</button>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="w-faint" style={{ fontSize: 10.5, marginTop: 12, lineHeight: 1.6 }}>
              ※ 매수 시점의 Thesis와 조건은 <b>잠금</b>되어 사후 편집되지 않습니다 (이력은 별도 보존). 가격이 임계치에 도달하면 알람이 「왜 움직였다고 생각하나?」 반응 메모를 요청합니다. 청산 후에는 thesis ↔ 결과 차이가 자동 정리되어 「실수 태그」가 집계됩니다.
            </div>
          </div>
        )}

        {hubItem === '활동 기록' && (
          <div>
            <h2 className="w-h2" style={{ marginBottom: 12 }}>활동 기록 · 최근 30일</h2>
            <div className="w-card" style={{ padding: 0 }}>
              {[
                ['2026-05-10 14:32', '관심종목 추가', 'NVDA'],
                ['2026-05-10 11:08', '거래 입력', 'AAPL 매수 10주 @ $184.32'],
                ['2026-05-09 18:42', '고수 팔로우', 'Peter Lynch'],
                ['2026-05-08 09:14', '용어 북마크', 'Free Cash Flow'],
                ['2026-05-06 22:01', '검색 저장', '저PER 고ROE'],
                ['2026-05-05 13:24', '리포트 읽음', 'NVDA Q1 실적 분석'],
                ['2026-05-04 16:50', '메모 작성', 'NVDA · 매수 이유'],
                ['2026-05-02 10:18', '알림 설정', 'NVDA 가격 $1000 도달'],
              ].map((r,i,arr) => (
                <div key={i} className="w-row" style={{ padding: '8px 12px', fontSize: 11.5, borderBottom: i < arr.length - 1 ? `1px solid ${W.hairline}` : 'none' }}>
                  <div className="w-mono w-faint" style={{ width: 130 }}>{r[0]}</div>
                  <div style={{ width: 110 }}>{r[1]}</div>
                  <div className="w-grow">{r[2]}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Transactions body (no AppBar)
  const TxBody = () => {
    const txs = [
      { d: '2026-05-04', t: '매수', s: 'AAPL', q: 10, p: '184.32', cur: 'USD', total: '1,843.20', fee: '0.50' },
      { d: '2026-04-28', t: '매도', s: 'TSLA', q: 5, p: '224.10', cur: 'USD', total: '1,120.50', fee: '0.40' },
      { d: '2026-04-22', t: '매수', s: '005930', q: 50, p: '78,400', cur: 'KRW', total: '3,920,000', fee: '785' },
      { d: '2026-04-15', t: '배당', s: 'MSFT', q: 0, p: '0.83', cur: 'USD', total: '4.15', fee: '0' },
      { d: '2026-04-10', t: '매수', s: 'NVDA', q: 4, p: '880.40', cur: 'USD', total: '3,521.60', fee: '0.80' },
      { d: '2026-04-02', t: '매도', s: '000660', q: 20, p: '202,000', cur: 'KRW', total: '4,040,000', fee: '808' },
    ];
    const tColor = t => t === '매수' ? W.up : t === '매도' ? W.down : W.muted;
    return (
      <div style={{ padding: 20, overflow: 'auto' }}>
        <div className="w-row" style={{ marginBottom: 16, gap: 12 }}>
          <div className="w-grow">
            <h1 className="w-h1">거래 내역 <span className="w-faint" style={{ fontSize: 12, fontWeight: 400 }}>Transactions</span></h1>
            <div className="w-muted" style={{ fontSize: 12, marginTop: 2 }}>매수·매도·배당 기록을 직접 입력하면 포트폴리오에 자동 반영됩니다.</div>
          </div>
          <button className="w-btn">CSV 가져오기</button>
          <button className="w-btn">내보내기</button>
          <button className="w-btn w-btn-primary">+ 거래 입력</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            ['총 거래', '124건'],
            ['올해 매수', '₩ 12.4M'],
            ['올해 매도', '₩ 8.2M'],
            ['실현 손익', '+₩ 1,840,200', W.up],
            ['수수료/세금', '₩ 84,300'],
          ].map(([l, v, c]) => (
            <div key={l} className="w-card-soft" style={{ padding: 10 }}>
              <div className="w-h3" style={{ fontSize: 10 }}>{l}</div>
              <div className="w-num-md" style={{ fontSize: 16, marginTop: 4, color: c || W.ink }}>{v}</div>
            </div>
          ))}
        </div>

        <div className="w-row" style={{ gap: 8, marginBottom: 10 }}>
          <input className="w-input" placeholder="종목 검색" style={{ width: 200 }} />
          <span className="w-pill" style={{ background: W.fill }}>전체</span>
          <span className="w-pill">매수</span>
          <span className="w-pill">매도</span>
          <span className="w-pill">배당</span>
          <span className="w-pill">입출금</span>
          <div className="w-grow" />
          <span className="w-pill">기간 · 2026 ▾</span>
          <span className="w-pill">통화 · 전체 ▾</span>
        </div>

        <div className="w-card" style={{ padding: 0 }}>
          <div className="w-row" style={{ padding: '8px 12px', background: W.fill, fontSize: 11, fontWeight: 600, borderBottom: `1px solid ${W.line}` }}>
            <div style={{ width: 100 }}>날짜</div>
            <div style={{ width: 60 }}>구분</div>
            <div style={{ width: 100 }}>종목</div>
            <div style={{ width: 70, textAlign: 'right' }}>수량</div>
            <div style={{ width: 100, textAlign: 'right' }}>단가</div>
            <div style={{ width: 60 }}>통화</div>
            <div style={{ width: 130, textAlign: 'right' }}>금액</div>
            <div style={{ width: 80, textAlign: 'right' }}>수수료</div>
            <div className="w-grow" />
            <div style={{ width: 60, textAlign: 'right' }}>편집</div>
          </div>
          {txs.map((r, i) => (
            <div key={i} className="w-row" style={{ padding: '9px 12px', fontSize: 11.5, borderBottom: i < txs.length - 1 ? `1px solid ${W.hairline}` : 'none' }}>
              <div className="w-mono" style={{ width: 100 }}>{r.d}</div>
              <div style={{ width: 60 }}>
                <span className="w-tag" style={{ color: tColor(r.t), borderColor: tColor(r.t) }}>{r.t}</span>
              </div>
              <div className="w-mono" style={{ width: 100, fontWeight: 600 }}>{r.s}</div>
              <div className="w-mono" style={{ width: 70, textAlign: 'right' }}>{r.q || '—'}</div>
              <div className="w-mono" style={{ width: 100, textAlign: 'right' }}>{r.p}</div>
              <div className="w-faint" style={{ width: 60 }}>{r.cur}</div>
              <div className="w-mono" style={{ width: 130, textAlign: 'right' }}>{r.total}</div>
              <div className="w-mono w-faint" style={{ width: 80, textAlign: 'right' }}>{r.fee}</div>
              <div className="w-grow" />
              <div className="w-faint" style={{ width: 60, textAlign: 'right' }}>편집 · 삭제</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Settings body
  const SettingsBody = () => (
    <div className="w-row" style={{ flex: 1, overflow: 'hidden', alignItems: 'stretch' }}>
      <ClickSidePanel active={setItem} items={setItems} onPick={setSetItem} />
      <div style={{ flex: 1, padding: '20px 28px', overflow: 'auto' }}>
        <h1 className="w-h1" style={{ marginBottom: 16 }}>계정 설정 <span className="w-faint" style={{ fontSize: 12, fontWeight: 400 }}>· {setItem}</span></h1>

        {setItem === '투자 성향' && (
          <div>
            <FormRow label="투자 스타일" hint="추천·알림 개인화 기준">
              <div className="w-row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {['장기 투자','단기 트레이딩','배당 투자','성장주 중심','가치주 중심'].map((c,i) => (
                  <span key={c} className="w-pill" style={{ background: i === 0 || i === 3 ? W.ink : W.bg, color: i === 0 || i === 3 ? '#fff' : W.muted, borderColor: i === 0 || i === 3 ? W.ink : W.hairline }}>{c}</span>
                ))}
              </div>
            </FormRow>
            <FormRow label="관심 시장" hint="대시보드·종목 검색 필터 기본값">
              <div className="w-row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {[['한국', true],['미국', true],['ETF', true],['채권', false],['원자재', false],['Crypto', false]].map(([c, on]) => (
                  <span key={c} className="w-pill" style={{ background: on ? W.ink : W.bg, color: on ? '#fff' : W.muted, borderColor: on ? W.ink : W.hairline }}>{c}</span>
                ))}
              </div>
            </FormRow>
            <FormRow label="관심 섹터" hint="최대 5개">
              <div className="w-row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {[['반도체', true],['AI/소프트웨어', true],['헬스케어', true],['에너지', false],['금융', false],['소비재', false]].map(([c, on]) => (
                  <span key={c} className="w-pill" style={{ background: on ? W.ink : W.bg, color: on ? '#fff' : W.muted, borderColor: on ? W.ink : W.hairline }}>{c}</span>
                ))}
              </div>
            </FormRow>
            <FormRow label="투자 경력" hint="추천 난이도 조절">
              <div className="w-row" style={{ gap: 6 }}>
                {['1년 미만','1–3년','3–7년','7년 이상'].map((c, i) => (
                  <span key={c} className="w-pill" style={{ background: i === 2 ? W.ink : W.bg, color: i === 2 ? '#fff' : W.muted, borderColor: i === 2 ? W.ink : W.hairline }}>{c}</span>
                ))}
              </div>
            </FormRow>
            <FormRow label="리스크 감내" hint="단기 -20% 냙하 허용 관점">
              <div className="w-row" style={{ gap: 6 }}>
                {['보수적','중관','공격적'].map((c, i) => (
                  <span key={c} className="w-pill" style={{ background: i === 1 ? W.ink : W.bg, color: i === 1 ? '#fff' : W.muted, borderColor: i === 1 ? W.ink : W.hairline }}>{c}</span>
                ))}
              </div>
            </FormRow>
            <FormRow label="리밸런싱 주기">
              <div className="w-row" style={{ gap: 6 }}>
                {['월간','분기','반기','연간','이벤트 기반'].map((c, i) => (
                  <span key={c} className="w-pill" style={{ background: i === 1 ? W.ink : W.bg, color: i === 1 ? '#fff' : W.muted, borderColor: i === 1 ? W.ink : W.hairline }}>{c}</span>
                ))}
              </div>
            </FormRow>
            <div className="w-faint" style={{ fontSize: 10.5, marginTop: 12, lineHeight: 1.5 }}>
              ※ 이 설정은 홈 오늘·할 일, 저장 검색 제안, 고수 조합 추천, 뉴스 우선순위에 반영됩니다.
            </div>
          </div>
        )}

        {setItem === '프로필' && (
          <div>
            <FormRow label="프로필 사진">
              <div className="w-row" style={{ gap: 10 }}>
                <div style={{ width: 56, height: 56, border: `1px solid ${W.line}`, borderRadius: '50%' }} />
                <button className="w-btn">업로드</button>
                <button className="w-btn-ghost w-btn">제거</button>
              </div>
            </FormRow>
            <FormRow label="이름"><input className="w-input" style={{ width: 280 }} defaultValue="홍길동" /></FormRow>
            <FormRow label="닉네임" hint="댓글·일지 작성 시 표시"><input className="w-input" style={{ width: 280 }} defaultValue="value_hunter" /></FormRow>
            <FormRow label="이메일">
              <div className="w-row" style={{ gap: 10 }}>
                <input className="w-input" style={{ width: 280 }} defaultValue="hong@example.com" />
                <span className="w-tag" style={{ borderColor: W.up, color: W.up }}>인증됨</span>
              </div>
            </FormRow>
            <FormRow label="자기소개">
              <textarea className="w-input" style={{ width: 420, height: 80, resize: 'vertical' }} defaultValue="가치투자 7년차. 미국 기술주 + 한국 반도체 중심. 분기 실적 기반 리밸런싱." />
            </FormRow>
          </div>
        )}

        {setItem === '비밀번호' && (
          <div>
            <FormRow label="현재 비밀번호"><input className="w-input" type="password" style={{ width: 280 }} defaultValue="●●●●●●●●" /></FormRow>
            <FormRow label="새 비밀번호" hint="영문·숫자·특수문자 8자 이상"><input className="w-input" type="password" style={{ width: 280 }} /></FormRow>
            <FormRow label="새 비밀번호 확인"><input className="w-input" type="password" style={{ width: 280 }} /></FormRow>
            <FormRow label="2단계 인증" hint="OTP 앱 (Google Authenticator 등)">
              <div className="w-row" style={{ gap: 8 }}>
                <span className="w-tag" style={{ color: W.down, borderColor: W.down }}>비활성</span>
                <button className="w-btn">설정하기</button>
              </div>
            </FormRow>
          </div>
        )}

        {setItem === '연결된 소셜' && (
          <div>
            {[
              ['Google', 'hong@gmail.com', '연결됨', W.up],
              ['Apple', '—', '연결 안 됨', W.muted],
              ['Kakao', 'hong_k', '연결됨', W.up],
              ['Naver', '—', '연결 안 됨', W.muted],
            ].map(([n,e,s,c]) => (
              <FormRow key={n} label={n}>
                <div className="w-row" style={{ gap: 10 }}>
                  <div className="w-grow" style={{ fontSize: 12 }}>{e}</div>
                  <span className="w-tag" style={{ color: c, borderColor: c }}>{s}</span>
                  <button className="w-btn">{s === '연결됨' ? '연결 해제' : '연결하기'}</button>
                </div>
              </FormRow>
            ))}
          </div>
        )}

        {setItem === '시장 / 통화' && (
          <div>
            <FormRow label="기본 통화" hint="포트폴리오 환산 기준">
              <div className="w-row" style={{ gap: 6 }}>
                {['KRW', 'USD', 'EUR', 'JPY'].map(c => (
                  <span key={c} className="w-pill" style={{ background: c === 'KRW' ? W.ink : W.bg, color: c === 'KRW' ? '#fff' : W.muted, borderColor: c === 'KRW' ? W.ink : W.hairline }}>{c}</span>
                ))}
              </div>
            </FormRow>
            <FormRow label="기본 시장" hint="홈 화면 우선 표시">
              <div className="w-row" style={{ gap: 6 }}>
                {['한국 + 미국','한국','미국','글로벌'].map((c,i) => (
                  <span key={c} className="w-pill" style={{ background: i === 0 ? W.ink : W.bg, color: i === 0 ? '#fff' : W.muted, borderColor: i === 0 ? W.ink : W.hairline }}>{c}</span>
                ))}
              </div>
            </FormRow>
            <FormRow label="환율 표시" hint="실시간 환율 갱신 주기">
              <div className="w-row" style={{ gap: 6 }}>
                {['15분','1시간','일별'].map((c,i) => (
                  <span key={c} className="w-pill" style={{ background: i === 0 ? W.ink : W.bg, color: i === 0 ? '#fff' : W.muted, borderColor: i === 0 ? W.ink : W.hairline }}>{c}</span>
                ))}
              </div>
            </FormRow>
          </div>
        )}

        {setItem === '언어 / 타임존' && (
          <div>
            <FormRow label="언어">
              <div className="w-row" style={{ gap: 6 }}>
                {['한국어', 'English', '한·영 혼용'].map((c, i) => (
                  <span key={c} className="w-pill" style={{ background: i === 2 ? W.ink : W.bg, color: i === 2 ? '#fff' : W.muted, borderColor: i === 2 ? W.ink : W.hairline }}>{c}</span>
                ))}
              </div>
            </FormRow>
            <FormRow label="타임존">
              <div className="w-row" style={{ gap: 6 }}>
                {['Asia/Seoul','America/New_York','자동 감지'].map((c, i) => (
                  <span key={c} className="w-pill" style={{ background: i === 2 ? W.ink : W.bg, color: i === 2 ? '#fff' : W.muted, borderColor: i === 2 ? W.ink : W.hairline }}>{c}</span>
                ))}
              </div>
            </FormRow>
            <FormRow label="숫자 형식" hint="천 단위 구분 / 소수점 자릿수">
              <div className="w-row" style={{ gap: 6 }}>
                {['1,234.56','1.234,56','1 234.56'].map((c, i) => (
                  <span key={c} className="w-pill" style={{ background: i === 0 ? W.ink : W.bg, color: i === 0 ? '#fff' : W.muted, borderColor: i === 0 ? W.ink : W.hairline }}>{c}</span>
                ))}
              </div>
            </FormRow>
          </div>
        )}

        {setItem === '테마' && (
          <div>
            <FormRow label="테마" hint="시스템 따르기 권장">
              <div className="w-row" style={{ gap: 6 }}>
                {['시스템', '라이트', '다크'].map((c, i) => (
                  <span key={c} className="w-pill" style={{ background: i === 0 ? W.ink : W.bg, color: i === 0 ? '#fff' : W.muted, borderColor: i === 0 ? W.ink : W.hairline }}>{c}</span>
                ))}
              </div>
            </FormRow>
            <FormRow label="강조색" hint="포트폴리오·차트 액센트">
              <div className="w-row" style={{ gap: 6 }}>
                {[W.ink, W.up, W.down, W.accent].map((c, i) => (
                  <span key={i} style={{ width: 24, height: 24, background: c, border: `1px solid ${W.line}`, cursor: 'pointer' }} />
                ))}
              </div>
            </FormRow>
            <FormRow label="등락 색상" hint="한국식 ↔ 글로벌식">
              <div className="w-row" style={{ gap: 6 }}>
                {['🇰🇷 빨강 상승 / 파랑 하락','🌐 초록 상승 / 빨강 하락'].map((c, i) => (
                  <span key={c} className="w-pill" style={{ background: i === 1 ? W.ink : W.bg, color: i === 1 ? '#fff' : W.muted, borderColor: i === 1 ? W.ink : W.hairline }}>{c}</span>
                ))}
              </div>
            </FormRow>
            <FormRow label="차트 밀도">
              <div className="w-row" style={{ gap: 6 }}>
                {['컴팩트','보통','넓게'].map((c, i) => (
                  <span key={c} className="w-pill" style={{ background: i === 1 ? W.ink : W.bg, color: i === 1 ? '#fff' : W.muted, borderColor: i === 1 ? W.ink : W.hairline }}>{c}</span>
                ))}
              </div>
            </FormRow>
          </div>
        )}

        {setItem === '알림 설정' && (
          <FormRow label="알림 환경설정">
            <div className="w-col" style={{ gap: 6, fontSize: 12 }}>
              {['가격 알림 (도달 시)', '기술적 신호 (골든크로스 등)', '관심 고수 13F 업데이트', '배당 기준일 임박', '관심종목 공시', '주간 시장 리포트'].map((t,i) => (
                <label key={t} className="w-row" style={{ gap: 8 }}>
                  <span className="w-checkbox" style={{ background: i < 4 ? W.ink : W.bg }} />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </FormRow>
        )}

        {setItem === '데이터 내보내기' && (
          <div>
            <FormRow label="내 데이터 다운로드" hint="JSON 또는 CSV 형식">
              <div className="w-row" style={{ gap: 8 }}>
                <button className="w-btn">관심종목 (CSV)</button>
                <button className="w-btn">거래 내역 (CSV)</button>
                <button className="w-btn">전체 (JSON)</button>
              </div>
            </FormRow>
            <FormRow label="포트폴리오 백업" hint="설정 + 메모 포함 전체 백업">
              <button className="w-btn">백업 파일 다운로드</button>
            </FormRow>
            <FormRow label="가져오기" hint="다른 서비스에서 이전">
              <button className="w-btn">CSV 파일 업로드</button>
            </FormRow>
          </div>
        )}

        {setItem === '회원 탈퇴' && (
          <div>
            <div className="w-card" style={{ padding: 16, borderColor: W.down, background: W.bg }}>
              <div style={{ fontWeight: 600, color: W.down, marginBottom: 8 }}>⚠ 회원 탈퇴 안내</div>
              <div className="w-faint" style={{ fontSize: 11.5, lineHeight: 1.6, marginBottom: 12 }}>
                탈퇴 시 모든 관심종목·거래내역·메모·포트폴리오 데이터가 영구 삭제되며 복구할 수 없습니다.
                탈퇴 전 데이터 내보내기를 권장합니다.
              </div>
              <button className="w-btn" style={{ color: W.down, borderColor: W.down }}>회원 탈퇴 진행</button>
            </div>
          </div>
        )}

        {tab === '계정 설정' && (setItem === '프로필' || setItem === '비밀번호' || setItem === '시장 / 통화' || setItem === '언어 / 타임존' || setItem === '테마' || setItem === '알림 설정') && (
          <div className="w-row" style={{ marginTop: 16, gap: 8, justifyContent: 'flex-end' }}>
            <button className="w-btn">취소</button>
            <button className="w-btn w-btn-primary">변경사항 저장</button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-root">
      <AppBar active="" />
      <div style={{ borderBottom: `1px solid ${W.hairline}`, padding: '12px 16px 0' }}>
        <div className="w-row" style={{ gap: 8, alignItems: 'baseline', marginBottom: 8 }}>
          <h1 className="w-h1">마이페이지</h1>
          <span className="w-faint" style={{ fontSize: 11 }}>· 내 투자노트 — 메모·복기·학습을 한 곳에서</span>
        </div>
        <div className="w-row">
          {tabs.map(t => (
            <div key={t} onClick={() => setTab(t)} style={{
              padding: '8px 14px', fontSize: 12, cursor: 'pointer',
              fontWeight: t === tab ? 600 : 400, color: t === tab ? W.ink : W.muted,
              borderBottom: t === tab ? `2px solid ${W.ink}` : '2px solid transparent',
            }}>{t}</div>
          ))}
        </div>
      </div>
      {tab === '마이페이지' && <HubBody />}
      {tab === '거래 내역' && <TxBody />}
      {tab === '계정 설정' && <SettingsBody />}
    </div>
  );
}

window.WireAdmin = WireAdmin;
window.WireMyPageAll = WireMyPageAll;
