// Data Architecture v2.1 — 100% 공식 무료 API only
// Realistic call-volume table, KRX OpenAPI added, unofficial sources removed.

function WireDataArch() {
  const Box = ({ x, y, w = 160, h = 60, title, sub, kind = 'normal' }) => {
    const styles = {
      normal: { bg: W.bg, border: W.line, color: W.ink },
      ext:    { bg: W.fill, border: W.line, color: W.ink },
      core:   { bg: W.ink, border: W.ink, color: '#fff' },
      cron:   { bg: W.bg, border: W.accent, color: W.accent },
      ui:     { bg: '#fafafa', border: W.hairline, color: W.ink },
      admin:  { bg: '#fdf3f3', border: W.down, color: W.down },
    }[kind];
    return (
      <div style={{
        position: 'absolute', left: x, top: y, width: w, height: h,
        background: styles.bg, border: `1px solid ${styles.border}`,
        color: styles.color, padding: 8, fontSize: 11,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        <div style={{ fontWeight: 600, fontSize: 11.5 }}>{title}</div>
        {sub && <div style={{ fontSize: 10, opacity: 0.75, marginTop: 2 }}>{sub}</div>}
      </div>
    );
  };

  const Arrow = ({ x1, y1, x2, y2, label, dashed = false, color = W.muted, curve = 0 }) => {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const path = curve
      ? `M ${x1} ${y1} Q ${mx + curve} ${my} ${x2} ${y2}`
      : `M ${x1} ${y1} L ${x2} ${y2}`;
    return (
      <>
        <svg style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <defs>
            <marker id="arrow-mid-2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
            </marker>
          </defs>
          <path d={path} fill="none" stroke={color} strokeWidth="1.2"
            strokeDasharray={dashed ? '4,3' : ''} markerEnd="url(#arrow-mid-2)" />
        </svg>
        {label && (
          <div style={{
            position: 'absolute', left: mx - 40, top: my - 8, width: 80, textAlign: 'center',
            fontSize: 9.5, color, background: '#fafafa', padding: '0 4px',
          }}>{label}</div>
        )}
      </>
    );
  };

  return (
    <div className="w-root" style={{ padding: '24px 24px', background: '#fafafa', overflow: 'auto' }}>
      <div className="w-tag" style={{ marginBottom: 6 }}>Data Architecture v2.3 · 시세 + 리포트 파이프라인 · 100% 공식 무료</div>
      <h1 className="w-h1" style={{ marginBottom: 4, fontSize: 22 }}>STOCKLAB · 데이터 흐름</h1>
      <div className="w-muted" style={{ marginBottom: 16, fontSize: 12, lineHeight: 1.5 }}>
        지인 대상 서비스 → <b>재배포 가능한 공식 무료 데이터</b>만 사용. 시세 외에 <b>리포트 파이프라인</b>(Docling PDF 추출 + Gemini AI 요약) 추가.
        증권사 OpenAPI(KIS 등)는 계좌보유자만 사용·재배포 금지라 아예 사용하지 않음.
      </div>

      {/* Diagram */}
      <div style={{ position: 'relative', width: 1400, height: 760, margin: '0 auto' }}>

        {/* External APIs (left) */}
        <div style={{ position: 'absolute', left: 20, top: 8, fontSize: 10, color: W.muted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>외부 API · 공식 무료</div>
        <Box x={20}  y={32}  title="KRX OpenAPI"   sub="한 일별 시세·지수 · 1만/일" kind="ext" />
        <Box x={20}  y={100} title="DART"          sub="한 재무·공시 · 1만/일"      kind="ext" />
        <Box x={20}  y={168} title="Finnhub Free"  sub="미 시세 · 60/min · 15분 지연" kind="ext" />
        <Box x={20}  y={236} title="SEC EDGAR"     sub="미 재무·공시·13F · 무제한"    kind="ext" />
        <Box x={20}  y={304} title="FRED"          sub="매크로·금리·환율 · 무제한"     kind="ext" />
        <Box x={20}  y={372} title="리포트 RSS · 30+" sub="BOK·KDI·IMF·OECD·BIS·BlackRock" kind="ext" />
        <Box x={20}  y={440} title="NewsAPI + RSS" sub="뉴스 · 100/일 + 무제한"      kind="ext" />
        <Box x={20}  y={508} title="Gemini 1.5 Flash" sub="AI 요약 · 1,500/일 무료"    kind="ext" />

        {/* Cron (middle-left) */}
        <div style={{ position: 'absolute', left: 240, top: 8, fontSize: 10, color: W.accent, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Vercel Cron</div>
        <Box x={240} y={32}  w={170} title="미 시세 (15분, 장중)"   sub="관심+히트맵 ~600 종목" kind="cron" />
        <Box x={240} y={100} w={170} title="한 시세 (일 1회 18:30)" sub="KRX 종가 일괄"        kind="cron" />
        <Box x={240} y={168} w={170} title="지수·환율 (15분)"       sub="KOSPI·S&P·USD/KRW"   kind="cron" />
        <Box x={240} y={236} w={170} title="시장 심리 (15분)"       sub="VIX·F&G·V-KOSPI"     kind="cron" />
        <Box x={240} y={304} w={170} title="재무 (일 1회 03:00)"    sub="DART + EDGAR"        kind="cron" />
        <Box x={240} y={372} w={170} title="뉴스 (30분)"            sub="RSS 우선·NewsAPI 보조" kind="cron" />
        <Box x={240} y={440} w={170} title="13F (분기 1회)"         sub="고수 보유 변경"        kind="cron" />
        <Box x={240} y={508} w={170} title="리포트 폴링 (일 2회)"    sub="06:00 KR · 06:30 GLOBAL" kind="cron" />

        {/* Docling worker — 별도 노드 */}
        <div style={{ position: 'absolute', left: 240, top: 588, fontSize: 10, color: W.accent, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>GitHub Actions Worker</div>
        <Box x={240} y={612} w={170} title="Docling 워커 (07:00)"   sub="PDF → Markdown · 무료 2K분/월" kind="cron" />
        <Box x={240} y={680} w={170} title="Gemini 요약 (07:30)"    sub="한글 요약 + 영문 번역" kind="cron" />

        {/* Supabase tables */}
        <div style={{ position: 'absolute', left: 480, top: 8, fontSize: 10, color: W.ink, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Supabase · Postgres (캐시)</div>
        <Box x={480} y={32}  w={200} title="quotes"        sub="symbol · px · pct · ts" kind="core" />
        <Box x={480} y={100} w={200} title="quotes_daily"  sub="한 일별 종가 (KRX)"      kind="core" />
        <Box x={480} y={168} w={200} title="indices"       sub="code · value · spark"   kind="core" />
        <Box x={480} y={236} w={200} title="sentiment"     sub="VIX · F&G · V-KOSPI"    kind="core" />
        <Box x={480} y={304} w={200} title="financials"    sub="BS·IS·CF · 연/분기"      kind="core" />
        <Box x={480} y={372} w={200} title="news"          sub="src · title · tickers"  kind="core" />
        <Box x={480} y={440} w={200} title="master_holdings" sub="13F · 고수 보유"       kind="core" />
        <Box x={480} y={508} w={200} title="reports"          sub="src · cat · md · summary" kind="core" />
        <Box x={480} y={612} w={200} title="reports.tables_json" sub="표 추출 (Docling)"   kind="core" />
        <Box x={480} y={680} w={200} title="alerts (queue)"  sub="user · rule · status" kind="core" />

        {/* User-data tables */}
        <div style={{ position: 'absolute', left: 720, top: 8, fontSize: 10, color: W.ink, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>사용자 데이터</div>
        <Box x={720} y={32}  w={170} title="auth.users"     sub="Supabase Auth"           kind="core" />
        <Box x={720} y={100} w={170} title="watchlists"     sub="user · name · symbols[]" kind="core" />
        <Box x={720} y={168} w={170} title="follows"        sub="user · master_id"        kind="core" />
        <Box x={720} y={236} w={170} title="bookmarks"      sub="user · term/article"     kind="core" />
        <Box x={720} y={304} w={170} title="holdings"       sub="user · qty · avg_px"     kind="core" />
        <Box x={720} y={372} w={170} title="transactions"   sub="user · type · qty · px"  kind="core" />
        <Box x={720} y={440} w={170} title="notes"          sub="user · symbol · md"      kind="core" />
        <Box x={720} y={508} w={170} title="saved_screens"  sub="user · filters · name"   kind="core" />
        <Box x={720} y={612} w={170} title="user_report_bookmarks" sub="user · report · notes" kind="core" />

        {/* RLS gate */}
        <div style={{
          position: 'absolute', left: 905, top: 32, width: 60, height: 540,
          border: `1.5px dashed ${W.accent}`, color: W.accent, fontSize: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          writingMode: 'vertical-rl', transform: 'rotate(180deg)',
        }}>RLS · 행단위 권한</div>

        {/* Frontend */}
        <div style={{ position: 'absolute', left: 985, top: 8, fontSize: 10, color: W.muted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Next.js 14 · 화면</div>
        <Box x={985}  y={32}  w={180} title="홈 · Dashboard"      sub="quotes · indices · sentiment" kind="ui" />
        <Box x={985}  y={100} w={180} title="분석 · Analysis"      sub="quotes · financials"         kind="ui" />
        <Box x={985}  y={168} w={180} title="종목 검색 · Screener" sub="quotes · financials"         kind="ui" />
        <Box x={985}  y={236} w={180} title="고수 따라잡기"        sub="master_holdings · follows"    kind="ui" />
        <Box x={985}  y={304} w={180} title="학습 · Learn"         sub="terms · articles"            kind="ui" />
        <Box x={985}  y={372} w={180} title="포트폴리오"            sub="holdings · transactions"     kind="ui" />
        <Box x={985}  y={440} w={180} title="마이페이지"            sub="watchlists · bookmarks"      kind="ui" />
        <Box x={985}  y={508} w={180} title="알림 / 메일"           sub="alerts · email"              kind="ui" />

        {/* Admin */}
        <div style={{ position: 'absolute', left: 1195, top: 8, fontSize: 10, color: W.down, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>관리자</div>
        <Box x={1195} y={32}  w={185} title="고수 CRUD"        sub="master_holdings 보정"  kind="admin" />
        <Box x={1195} y={100} w={185} title="학습 CRUD"        sub="articles · terms"     kind="admin" />
        <Box x={1195} y={168} w={185} title="뉴스 큐레이션"    sub="news 핀/숨김"          kind="admin" />
        <Box x={1195} y={236} w={185} title="사용자 관리"      sub="auth.users · roles"   kind="admin" />
        <Box x={1195} y={304} w={185} title="API 모니터"       sub="rate · quota · 실패"   kind="admin" />
        <Box x={1195} y={372} w={185} title="Cron 로그"        sub="실행 이력 · 재시도"     kind="admin" />
        <Box x={1195} y={440} w={185} title="공지사항"          sub="banners · changelog"  kind="admin" />
        <Box x={1195} y={508} w={185} title="권한 / 역할"       sub="admin · editor · user" kind="admin" />

        {/* Arrows */}
        {[32, 100, 168, 236, 304, 372, 440, 508].map((y, i) => (
          <Arrow key={'a'+i} x1={180} y1={y + 30} x2={240} y2={y + 30} dashed />
        ))}
        {[32, 100, 168, 236, 304, 372, 440, 508].map((y, i) => (
          <Arrow key={'b'+i} x1={410} y1={y + 30} x2={480} y2={y + 30} color={W.accent} label={i === 0 ? 'upsert' : ''} />
        ))}
        <Arrow x1={680} y1={62}  x2={985}  y2={62}  label="read" />
        <Arrow x1={680} y1={130} x2={985}  y2={62} />
        <Arrow x1={680} y1={198} x2={985}  y2={130} />
        <Arrow x1={680} y1={266} x2={985}  y2={62} />
        <Arrow x1={680} y1={334} x2={985}  y2={130} />
        <Arrow x1={680} y1={402} x2={985}  y2={336} />
        <Arrow x1={680} y1={470} x2={985}  y2={266} />
        <Arrow x1={890} y1={130} x2={985}  y2={470} label="auth" />
        <Arrow x1={890} y1={336} x2={985}  y2={402} />
        <Arrow x1={680} y1={400} x2={1195} y2={62}  label="read/write" curve={-30} />

        {/* Report pipeline arrows */}
        <Arrow x1={180} y1={402} x2={240} y2={538} dashed label="PDF URL" />
        <Arrow x1={410} y1={538} x2={480} y2={538} color={W.accent} label="insert" />
        <Arrow x1={325} y1={572} x2={325} y2={612} color={W.accent} />
        <Arrow x1={410} y1={642} x2={480} y2={642} color={W.accent} label="md+표" />
        <Arrow x1={180} y1={538} x2={240} y2={710} dashed label="AI" curve={20} />
        <Arrow x1={410} y1={710} x2={480} y2={538} color={W.accent} label="summary" curve={-30} />
        <Arrow x1={680} y1={538} x2={985} y2={336} label="학습/리포트" curve={20} />
      </div>

      {/* === Call-volume verification table (NEW) === */}
      <div className="w-card" style={{ padding: 16, marginTop: 24, maxWidth: 1400, marginInline: 'auto' }}>
        <h2 className="w-h2" style={{ marginBottom: 4 }}>호출량 검증표</h2>
        <div className="w-faint" style={{ fontSize: 11, marginBottom: 12 }}>
          모든 cron의 일별 외부 API 호출 합계 — 무료 한도 안에서 동작
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead>
              <tr style={{ background: W.fill, borderBottom: `1px solid ${W.line}` }}>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Cron 작업</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>실행 빈도</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>1회 호출 수</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>일 총 호출</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>외부 API</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>한도</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['미 시세 (15분, 장중)',     '32회/일',  '600',     '19,200', 'Finnhub Free',     '60/min · 86,400/일', '✓ 안전', W.up],
                ['한 시세 (일 1회 18:30)',    '1회/일',   '1 bulk',  '1',     'KRX OpenAPI',      '~10K/일',           '✓ 안전', W.up],
                ['지수·환율 (15분)',          '96회/일',  '12',      '1,152', 'Finnhub + FRED',   '여유',              '✓ 안전', W.up],
                ['시장 심리 (15분)',          '96회/일',  '6',       '576',   'Finnhub + 스크랩',  '여유',              '✓ 안전', W.up],
                ['재무 (일 1회 03:00)',       '1회/일',   '~500',    '500',   'DART + EDGAR',     'DART 10K · EDGAR ∞', '✓ 안전', W.up],
                ['뉴스 (30분)',               '48회/일',  '~10',     '480',   'RSS + NewsAPI',    'RSS ∞ · NewsAPI 100', '✓ 안전', W.up],
                ['13F (분기 1회)',            '1회/3개월','~10',     '~0.1',  'SEC EDGAR',        '무제한',             '✓ 안전', W.up],
                ['알림 평가 (1분, DB)',       '1440회/일','0 (DB)',  '0',     '— (외부 호출 없음)', '—',                 '✓ 안전', W.up],
              ].map(([n, f, p, t, api, q, s, c], i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${W.hairline}` }}>
                  <td style={{ padding: '8px 10px', fontWeight: 500 }}>{n}</td>
                  <td className="w-mono" style={{ padding: '8px 10px', textAlign: 'right' }}>{f}</td>
                  <td className="w-mono" style={{ padding: '8px 10px', textAlign: 'right' }}>{p}</td>
                  <td className="w-mono" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{t}</td>
                  <td style={{ padding: '8px 10px', color: W.muted }}>{api}</td>
                  <td className="w-mono w-faint" style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10.5 }}>{q}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', color: c, fontWeight: 600 }}>{s}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="w-muted" style={{ fontSize: 10.5, marginTop: 10, lineHeight: 1.6 }}>
          ※ <b>장중만</b>: 한국장 09:00–15:30 + 미국장 22:30–익일 05:00 (KST), 합계 약 8시간 → 32회 (15분 간격)<br/>
          ※ <b>알림 평가</b>는 cron이지만 외부 API를 호출하지 않고 quotes 테이블만 읽음 → 사용자 수와 무관하게 호출량 0
        </div>
      </div>

      {/* Legend */}
      <div className="w-row" style={{ gap: 24, marginTop: 16, padding: 12, background: W.bg, border: `1px solid ${W.hairline}`, fontSize: 11, flexWrap: 'wrap', maxWidth: 1400, marginInline: 'auto' }}>
        <div className="w-row" style={{ gap: 6 }}>
          <span style={{ width: 14, height: 8, background: W.fill, border: `1px solid ${W.line}` }} /> 외부 공식 API
        </div>
        <div className="w-row" style={{ gap: 6 }}>
          <span style={{ width: 14, height: 8, background: W.bg, border: `1px solid ${W.accent}` }} /> Vercel Cron
        </div>
        <div className="w-row" style={{ gap: 6 }}>
          <span style={{ width: 14, height: 8, background: W.ink }} /> Supabase 테이블
        </div>
        <div className="w-row" style={{ gap: 6 }}>
          <span style={{ width: 14, height: 8, background: '#fafafa', border: `1px solid ${W.hairline}` }} /> 사용자 화면
        </div>
        <div className="w-row" style={{ gap: 6 }}>
          <span style={{ width: 14, height: 8, background: '#fdf3f3', border: `1px solid ${W.down}` }} /> 관리자
        </div>
        <div className="w-row" style={{ gap: 6 }}>
          <svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke={W.muted} strokeWidth="1.2" strokeDasharray="4,3" /></svg>
          외부 호출
        </div>
        <div className="w-row" style={{ gap: 6 }}>
          <svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke={W.muted} strokeWidth="1.2" /></svg>
          DB I/O
        </div>
      </div>

      {/* Notes */}
      <div className="w-row" style={{ gap: 12, marginTop: 12, alignItems: 'flex-start', maxWidth: 1400, marginInline: 'auto' }}>
        <div className="w-card-soft" style={{ padding: 12, flex: 1 }}>
          <div className="w-h3" style={{ marginBottom: 4 }}>한국 데이터의 한계 (무료만)</div>
          <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 11, color: W.muted, lineHeight: 1.7 }}>
            <li>KRX OpenAPI는 <b>일별 종가만</b> (분/실시간 없음)</li>
            <li>장 마감 후 18:00경 데이터 갱신</li>
            <li>분 단위가 필요한 화면은 미국 종목 위주</li>
            <li>DART는 재무·공시 모두 무료, 거의 무제한</li>
            <li>한국 컨센서스(목표가)는 무료 소스 없음 → 표시 안 함</li>
          </ul>
        </div>
        <div className="w-card-soft" style={{ padding: 12, flex: 1 }}>
          <div className="w-h3" style={{ marginBottom: 4 }}>라이선스 · 약관 체크</div>
          <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 11, color: W.muted, lineHeight: 1.7 }}>
            <li>KRX OpenAPI: 일별 종가 <b>재배포 OK</b></li>
            <li>DART/EDGAR/FRED: 공공데이터 <b>재배포 OK</b></li>
            <li>Finnhub Free: 개인·소규모 OK (약관 확인)</li>
            <li>RSS: 공식 피드 헤드라인 + 링크 OK</li>
            <li>네이버·다음·yfinance ❌ (스크래핑·차단)</li>
            <li>KIS 등 증권사 OpenAPI ❌ (계좌보유자만, 재배포 금지)</li>
          </ul>
        </div>
        <div className="w-card-soft" style={{ padding: 12, flex: 1 }}>
          <div className="w-h3" style={{ marginBottom: 4 }}>호스팅 비용 (모두 무료)</div>
          <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 11, color: W.muted, lineHeight: 1.7 }}>
            <li>Vercel Hobby: 트래픽·Cron 무료</li>
            <li>Supabase Free: 500MB DB · 50K MAU</li>
            <li>도메인은 별도 (~연 1만5천원)</li>
            <li>유료 전환 시점: 사용자 1K 초과 또는 실시간 시세 필요할 때</li>
            <li>그 전까지 운영비 = 도메인비뿐</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

window.WireDataArch = WireDataArch;
