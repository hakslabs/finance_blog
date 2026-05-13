// Home / Dashboard
// Sections:
//  - Dual Fear & Greed gauges (KR + US)
//  - Core macro tiles: KR/US index, FX, oil, gold, BTC
//  - Watchlist + Currently-open-market top movers (side by side)
//  - Key market news (broad, not personal)
//  - My calendar: market events + my watchlist earnings/dividends
//  - Returns chart with KOSPI + S&P 500 overlays
//  - Heatmaps × 2: KR, US

function FearGreedGaugeCompact({ value, w = 200, h = 116, market }) {
  const cx = w / 2;
  const cy = h - 10;
  const r = Math.min(w / 2 - 12, h - 22);
  const bands = [
    { to: 25,  color: W.down,    label: 'Extreme Fear' },
    { to: 45,  color: '#d97c41', label: 'Fear' },
    { to: 55,  color: W.muted,   label: 'Neutral' },
    { to: 75,  color: '#7aa84a', label: 'Greed' },
    { to: 100, color: W.up,      label: 'Extreme Greed' },
  ];
  const arc = (from, to) => {
    const a1 = Math.PI - (from / 100) * Math.PI;
    const a2 = Math.PI - (to / 100) * Math.PI;
    return `M ${cx + r * Math.cos(a1)} ${cy - r * Math.sin(a1)}
            A ${r} ${r} 0 0 1 ${cx + r * Math.cos(a2)} ${cy - r * Math.sin(a2)}`;
  };
  let prev = 0;
  const segs = bands.map(b => { const s = { from: prev, ...b }; prev = b.to; return s; });
  const ang = Math.PI - (value / 100) * Math.PI;
  const nx = cx + (r - 5) * Math.cos(ang);
  const ny = cy - (r - 5) * Math.sin(ang);
  const active = segs.find(s => value <= s.to) || segs[segs.length - 1];

  return (
    <div style={{ position: 'relative', width: w, height: h }}>
      <div style={{ position: 'absolute', top: 0, left: 0, fontSize: 10, color: W.muted, fontWeight: 600 }}>{market}</div>
      <svg width={w} height={h} style={{ display: 'block' }}>
        {segs.map((s, i) => (
          <path key={i} d={arc(s.from, s.to)} stroke={s.color} strokeWidth="9" fill="none" strokeLinecap="butt" />
        ))}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={W.ink} strokeWidth="1.6" />
        <circle cx={cx} cy={cy} r="3" fill={W.ink} />
      </svg>
      <div style={{ position: 'absolute', top: h - 46, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
        <div className="w-mono" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 10, color: active.color, fontWeight: 600 }}>{active.label}</div>
      </div>
    </div>
  );
}

function WireHome() {
  const macros = [
    { label: 'KOSPI',     en: '코스피',    val: '2,684.32',  chg: '+0.69%', up: true  },
    { label: 'S&P 500',   en: '미국',      val: '5,812.44',  chg: '+0.38%', up: true  },
    { label: 'USD/KRW',   en: '원/달러',   val: '1,387.20',  chg: '−0.22%', up: false },
    { label: 'WTI',       en: '국제유가',  val: '$71.84',    chg: '+0.59%', up: true  },
    { label: 'GOLD',      en: '금',        val: '$2,318.4',  chg: '+0.41%', up: true  },
    { label: 'BTC',       en: '비트코인',  val: '$61,240',   chg: '−1.32%', up: false },
  ];

  const watchlist = [
    { tk: 'AAPL',   nm: 'Apple',      px: '184.32',  chg: '+1.24%', up: true,  ma: 'up',   rsi: 62, memo: 4, evt: '배당락 D-2', status: '보유' },
    { tk: 'NVDA',   nm: 'NVIDIA',     px: '912.18',  chg: '+3.42%', up: true,  ma: 'up',   rsi: 78, memo: 9, evt: '실적 D-1', status: '검토' },
    { tk: '005930', nm: '삼성전자',    px: '78,400',  chg: '+0.51%', up: true,  ma: 'neutral', rsi: 51, memo: 6, evt: '잠정실적 D-16', status: '보유' },
    { tk: 'TSLA',   nm: 'Tesla',      px: '218.40',  chg: '−2.10%', up: false, ma: 'down', rsi: 38, memo: 3, evt: '—',           status: '제외' },
    { tk: '000660', nm: 'SK하이닉스',  px: '198,500', chg: '−1.24%', up: false, ma: 'up',   rsi: 28, memo: 2, evt: '—',           status: '후보' },
    { tk: 'MSFT',   nm: 'Microsoft',  px: '424.10',  chg: '+0.82%', up: true,  ma: 'up',   rsi: 58, memo: 0, evt: '—',           status: '관찰' },
  ];

  // Currently-open market: KRX is open in this mock (KST 14:32)
  const topMovers = [
    { tk: '005930', nm: '삼성전자',    px: '78,400',  chg: '+0.51%', up: true,  vol: '8.2M' },
    { tk: '000660', nm: 'SK하이닉스',  px: '198,500', chg: '−1.24%', up: false, vol: '3.1M' },
    { tk: '373220', nm: 'LG엔솔',      px: '362,000', chg: '+0.83%', up: true,  vol: '0.4M' },
    { tk: '207940', nm: '삼성바이오',   px: '821,000', chg: '+1.42%', up: true,  vol: '0.2M' },
    { tk: '035420', nm: 'NAVER',      px: '189,400', chg: '−0.31%', up: false, vol: '0.9M' },
    { tk: '005380', nm: '현대차',      px: '241,500', chg: '+2.11%', up: true,  vol: '1.2M' },
  ];

  const rsiLight = (rsi) => {
    if (rsi >= 70) return { color: W.down, label: '과매수', on: true };
    if (rsi <= 30) return { color: W.up,   label: '과매도', on: true };
    return { color: W.muted, label: rsi, on: false };
  };
  const maLight = (ma) => {
    if (ma === 'up')   return { color: W.up,   label: '↑', on: true };
    if (ma === 'down') return { color: W.down, label: '↓', on: true };
    return { color: W.muted, label: '=', on: false };
  };

  const news = [
    { src: 'Bloomberg', t: '연준 위원, "9월 인하 가능성 열어둘 것"',          time: '12분',  cat: 'macro', rel: ['QQQ','SPY'],     impact: '+0.18%' },
    { src: '한국경제',   t: '코스피 외인 순매수 5거래일 연속, 반도체 주도',      time: '34분',  cat: 'kr',    rel: ['005930','000660'], impact: '+0.32%', mine: true },
    { src: 'Reuters',   t: '엔비디아 추론 칩 발표 후 AI 반도체 일제 상승',     time: '1시간', cat: 'us',    rel: ['NVDA','AMD','TSM'], impact: '+0.42%' },
    { src: 'WSJ',       t: '국제유가 WTI 72달러 회복, OPEC+ 감산 연장 관측',   time: '2시간', cat: 'macro', rel: ['XOM','CVX'],    impact: '—' },
    { src: '연합뉴스',   t: '원/달러 1,387원 하락 마감, 위험선호 회복',         time: '3시간', cat: 'kr',    rel: ['005930'],       impact: '+0.05%' },
  ];

  const calendar = [
    { d: '5/06', day: '화', e: '미 무역수지',           type: 'macro',    imp: 2, hold: null,    memos: 0 },
    { d: '5/07', day: '수', e: 'NVDA 실적 (장마감 후)', type: 'earnings', imp: 3, tk: 'NVDA', hold: '12.4%', memos: 9, check: '2/4' },
    { d: '5/08', day: '목', e: 'AAPL 분기 배당락',      type: 'dividend', imp: 2, tk: 'AAPL', hold: '9.1%',  memos: 4 },
    { d: '5/08', day: '목', e: 'FOMC 회의록',           type: 'macro',    imp: 3, hold: null,    memos: 0 },
    { d: '5/13', day: '화', e: 'AAPL WWDC',            type: 'earnings', imp: 2, tk: 'AAPL', hold: '9.1%',  memos: 4 },
    { d: '5/15', day: '목', e: '미 CPI',                type: 'macro',    imp: 3, hold: null,    memos: 0 },
    { d: '5/22', day: '목', e: '005930 잠정실적',       type: 'earnings', imp: 3, tk: '005930', hold: '18.2%', memos: 6 },
  ];

  const catColor = (c) => c === 'kr' ? '#2c6fa5' : c === 'us' ? '#a55b2c' : W.muted;
  const catLabel = (c) => c === 'kr' ? '🇰🇷 한국' : c === 'us' ? '🇺🇸 미국' : '매크로';
  const typeColor = (t) => t === 'earnings' ? W.accent : t === 'dividend' ? '#7aa84a' : W.muted;
  const typeLabel = (t) => t === 'earnings' ? '실적' : t === 'dividend' ? '배당' : '매크로';

  return (
    <div className="w-root">
      <AppBar active="home" />
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>

        {/* Top band */}
        <div className="w-row" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}>
            <h1 className="w-h1">좋은 아침입니다, Hak Lee 님</h1>
            <div className="w-muted" style={{ fontSize: 11, marginTop: 2 }}>
              오늘의 투자 상황판 · 5월 6일 화 14:32 · <b style={{ color: W.up }}>● KRX 개장 중</b> <span className="w-faint">/ NYSE 개장까지 6시간 28분</span>
            </div>
          </div>
          <div className="w-card-soft w-row" style={{ padding: '6px 12px', gap: 14 }}>
            <div><div className="w-h3" style={{ fontSize: 9 }}>내 자산</div><div className="w-num-md" style={{ fontSize: 14 }}>₩ 48,210,400</div></div>
            <div className="w-vrule" />
            <div><div className="w-h3" style={{ fontSize: 9 }}>오늘 손익</div><div className="w-num-md w-up" style={{ fontSize: 14 }}>+₩ 184,320 (+0.38%)</div></div>
            <div className="w-vrule" />
            <div><div className="w-h3" style={{ fontSize: 9 }}>총 수익률</div><div className="w-num-md w-up" style={{ fontSize: 14 }}>+12.4%</div></div>
          </div>
        </div>

        {/* NOTICES — from admin 공지사항 */}
        <div className="w-card-soft" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, borderLeft: `3px solid ${W.accent}` }}>
          <span className="w-pill" style={{ fontSize: 10, background: W.accent, color: '#fff', borderColor: W.accent }}>공지</span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>v3 출시 — 마이페이지 · Thesis 도입</span>
          <span className="w-faint" style={{ fontSize: 11 }}>매수 시점 thesis와 알람 반응 메모로 복기 흐름이 자연스러워졌습니다.</span>
          <span style={{ flex: 1 }} />
          <a className="w-faint" style={{ fontSize: 10, cursor: 'pointer' }} onClick={() => toast('공지 상세 — 별도 화면')}>자세히 →</a>
          <span className="w-faint" style={{ fontSize: 10 }}>2026-05-10</span>
          <button className="w-btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => openModal('confirm', { title: '공지 닫기', message: '이 공지를 더 이상 표시하지 않습니다.', cta: '닫기', toast: '공지를 닫았습니다' })}>✕</button>
        </div>

        {/* TODAY'S TODO — bridge from observation to action */}
        <div className="w-card" style={{ padding: 0, borderColor: W.accent }}>
          <div className="w-row" style={{ justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${W.hairline}`, background: 'rgba(42,111,219,0.05)' }}>
            <div className="w-row" style={{ gap: 8, alignItems: 'baseline' }}>
              <h2 className="w-h2" style={{ color: W.accent }}>오늘 할 일</h2>
              <span className="w-faint" style={{ fontSize: 10 }}>시장 이벤트 + 내 포지션 기반 추천</span>
            </div>
            <div className="w-row" style={{ gap: 6 }}>
              <span className="w-faint" style={{ fontSize: 10 }}>완료 1 / 5</span>
              <span className="w-pill" style={{ fontSize: 10 }}>마이페이지 →</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            {[
              { done: true,  t: 'NVDA 실적 발표 전 메모 업데이트',   meta: 'D-1 · 보유 12.4%',  cat: '실적', src: '공통' },
              { done: false, t: '삼성전자 외인 순매수 원인 확인',         meta: '5거래일 연속',     cat: '뉴스', src: '공통' },
              { done: false, t: 'AAPL 배당락 전 포지션 점검',         meta: 'D-2 · 보유 9.1%',   cat: '배당', src: '공통' },
              { done: false, t: 'NVDA −12% — Thesis 청산 조건 재검토', meta: '알람 트리거 · 반응 메모', cat: '복기', src: 'Thesis' },
              { done: false, t: 'TSLA +20% 도달 — 왜 움직였나 기록',  meta: '알람 트리거 · 미작성', cat: '복기', src: '알람' },
            ].map((todo, i, arr) => (
              <div key={i} className="w-row" style={{
                padding: '8px 12px', gap: 8, fontSize: 11.5,
                borderBottom: i < arr.length - 1 ? `1px solid ${W.hairline}` : 'none',
                borderRight: i % 2 === 0 ? `1px solid ${W.hairline}` : 'none',
                background: todo.done ? W.fill : 'transparent',
              }}>
                <span className="w-checkbox" style={{ background: todo.done ? W.ink : W.bg, flexShrink: 0 }} />
                <div className="w-grow" style={{ textDecoration: todo.done ? 'line-through' : 'none', color: todo.done ? W.muted : W.ink }}>{todo.t}</div>
                <span className="w-pill" style={{ fontSize: 9, padding: '1px 5px', background: todo.src==='공통' ? W.fill : todo.src==='알람' ? 'rgba(217,78,77,0.08)' : 'rgba(42,111,219,0.08)', color: todo.src==='공통' ? W.muted : todo.src==='알람' ? W.down : W.accent, borderColor: todo.src==='공통' ? W.hairline : todo.src==='알람' ? W.down : W.accent }}>{todo.src}</span>
                <span className="w-tag" style={{ fontSize: 9, color: W.muted, borderColor: W.hairline }}>{todo.cat}</span>
                <span className="w-faint w-mono" style={{ fontSize: 10, width: 110, textAlign: 'right' }}>{todo.meta}</span>
              </div>
            ))}
          </div>
        </div>

        {/* TOP — Two F&G gauges (KR + US) + Macro tiles (symmetric 1:1) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="w-card" style={{ padding: 10 }}>
            <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
              <div className="w-h3" style={{ fontSize: 10 }}>공포 · 탐욕 지수</div>
              <span className="w-faint" style={{ fontSize: 9 }}>일일 갱신</span>
            </div>
            <div className="w-row" style={{ gap: 0, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, padding: '4px 6px', borderRight: `1px solid ${W.hairline}` }}>
                <FearGreedGaugeCompact value={56} w={200} h={116} market="🇰🇷 한국" />
                <div className="w-faint" style={{ fontSize: 9.5, lineHeight: 1.4, marginTop: 4, textAlign: 'center' }}>
                  외인 5거래일 순매수
                </div>
              </div>
              <div style={{ flex: 1, padding: '4px 6px' }}>
                <FearGreedGaugeCompact value={68} w={200} h={116} market="🇺🇸 미국" />
                <div className="w-faint" style={{ fontSize: 9.5, lineHeight: 1.4, marginTop: 4, textAlign: 'center' }}>
                  VIX 14.2 · 안도 과열
                </div>
              </div>
            </div>
          </div>

          <div className="w-card" style={{ padding: 0 }}>
            <div className="w-row" style={{ justifyContent: 'space-between', padding: '6px 12px', borderBottom: `1px solid ${W.hairline}` }}>
              <div className="w-h3" style={{ fontSize: 10 }}>핵심 경제지표</div>
              <span className="w-faint" style={{ fontSize: 9 }}>14:32 · 15분 지연</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {macros.map((m, i) => (
                <div key={m.label} style={{
                  padding: '8px 12px',
                  borderRight: (i % 3 !== 2) ? `1px solid ${W.hairline}` : 'none',
                  borderBottom: i < 3 ? `1px solid ${W.hairline}` : 'none',
                }}>
                  <div className="w-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div className="w-h3" style={{ fontSize: 10 }}>{m.label}</div>
                    <div className="w-faint" style={{ fontSize: 9 }}>{m.en}</div>
                  </div>
                  <div className="w-row" style={{ marginTop: 2, gap: 6, alignItems: 'baseline' }}>
                    <div className="w-mono" style={{ fontSize: 15, fontWeight: 600 }}>{m.val}</div>
                    <div className={'w-mono ' + (m.up ? 'w-up' : 'w-down')} style={{ fontSize: 11 }}>
                      {m.up ? '▲' : '▼'} {m.chg}
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <Sparkline seed={'mc-' + m.label} up={m.up} width={40} height={14} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* WATCHLIST + TOP MOVERS (currently open market) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="w-card" style={{ padding: 0 }}>
            <div className="w-row" style={{ justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${W.hairline}` }}>
              <div className="w-row" style={{ gap: 8, alignItems: 'baseline' }}>
                <h2 className="w-h2">관심종목</h2>
                <span className="w-faint" style={{ fontSize: 10 }}>{watchlist.length}개</span>
              </div>
              <div className="w-faint" style={{ fontSize: 9 }}>
                <span style={{ color: W.up }}>●</span> 강세 <span style={{ color: W.down }}>●</span> 약세
              </div>
            </div>
            <div className="w-row" style={{ padding: '4px 12px', background: W.fill, fontSize: 9, color: W.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <div className="w-grow">종목</div>
              <div style={{ width: 56, textAlign: 'right' }}>현재가</div>
              <div style={{ width: 46, textAlign: 'right' }}>오늘</div>
              <div style={{ width: 24, textAlign: 'center' }}>MA</div>
              <div style={{ width: 44, textAlign: 'center' }}>RSI</div>
              <div style={{ width: 56, textAlign: 'center' }}>메모</div>
              <div style={{ width: 76, textAlign: 'left' }}>다음 이벤트</div>
            </div>
            {watchlist.map((s, i) => {
              const rsi = rsiLight(s.rsi);
              const ma = maLight(s.ma);
              return (
                <div key={s.tk} className="w-row" style={{
                  padding: '6px 12px',
                  borderBottom: i < watchlist.length - 1 ? `1px solid ${W.hairline}` : 'none',
                }}>
                  <div className="w-grow w-row" style={{ gap: 6, minWidth: 0 }}>
                    <div className="w-mono" style={{ fontSize: 11, fontWeight: 600, minWidth: 52 }}>{s.tk}</div>
                    <div className="w-faint" style={{ fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nm}</div>
                    <Sparkline seed={s.tk + '-3m'} up={s.up} width={28} height={14} />
                  </div>
                  <div className="w-mono" style={{ width: 56, textAlign: 'right', fontSize: 11 }}>{s.px}</div>
                  <div className={'w-mono ' + (s.up ? 'w-up' : 'w-down')} style={{ width: 46, textAlign: 'right', fontSize: 10 }}>{s.chg}</div>
                  <div style={{ width: 24, textAlign: 'center', fontSize: 11, color: ma.color, fontWeight: ma.on ? 700 : 400 }}>{ma.label}</div>
                  <div style={{ width: 44, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3 }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: rsi.on ? rsi.color : 'transparent',
                      border: `1.5px solid ${rsi.on ? rsi.color : W.hairline}`,
                    }} />
                    <span style={{ fontSize: 9.5, color: rsi.on ? rsi.color : W.faint, fontWeight: rsi.on ? 600 : 400 }}>{rsi.label}</span>
                  </div>
                  <div style={{ width: 56, textAlign: 'center', fontSize: 10, cursor: 'pointer' }} onClick={() => openModal('note', { context: `${s.tk} ${s.nm}` })}>
                    {s.memo > 0 ? (
                      <span style={{ color: W.accent, fontWeight: 600 }}>✎ {s.memo}</span>
                    ) : (
                      <span className="w-faint">+ 메모</span>
                    )}
                  </div>
                  <div className="w-faint" style={{ width: 76, fontSize: 9.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.evt}</div>
                </div>
              );
            })}
            <div className="w-faint" style={{ fontSize: 10, padding: '6px 12px', textAlign: 'right', borderTop: `1px solid ${W.hairline}` }}>
              전체 보기 →
            </div>
          </div>

          {/* Top movers in currently open market */}
          <div className="w-card" style={{ padding: 0 }}>
            <div className="w-row" style={{ justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${W.hairline}` }}>
              <div className="w-row" style={{ gap: 8, alignItems: 'baseline' }}>
                <h2 className="w-h2">실시간 상위 거래</h2>
                <span className="w-pill" style={{ fontSize: 9, padding: '0 5px', background: 'rgba(31,138,91,0.1)', borderColor: W.up, color: W.up }}>🇰🇷 KRX 개장 중</span>
              </div>
              <span className="w-faint" style={{ fontSize: 10 }}>거래대금 순</span>
            </div>
            <div className="w-row" style={{ padding: '4px 12px', background: W.fill, fontSize: 9, color: W.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <div style={{ width: 14 }}>#</div>
              <div className="w-grow">종목</div>
              <div style={{ width: 60, textAlign: 'right' }}>현재가</div>
              <div style={{ width: 50, textAlign: 'right' }}>오늘</div>
              <div style={{ width: 44, textAlign: 'right' }}>거래량</div>
            </div>
            {topMovers.map((s, i) => (
              <div key={s.tk} className="w-row" style={{
                padding: '6px 12px',
                borderBottom: i < topMovers.length - 1 ? `1px solid ${W.hairline}` : 'none',
              }}>
                <div className="w-mono" style={{ width: 14, fontSize: 10, color: W.muted }}>{i + 1}</div>
                <div className="w-grow w-row" style={{ gap: 6, minWidth: 0 }}>
                  <div className="w-mono" style={{ fontSize: 11, fontWeight: 600, minWidth: 52 }}>{s.tk}</div>
                  <div className="w-faint" style={{ fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nm}</div>
                </div>
                <div className="w-mono" style={{ width: 60, textAlign: 'right', fontSize: 11 }}>{s.px}</div>
                <div className={'w-mono ' + (s.up ? 'w-up' : 'w-down')} style={{ width: 50, textAlign: 'right', fontSize: 10 }}>{s.chg}</div>
                <div className="w-mono w-faint" style={{ width: 44, textAlign: 'right', fontSize: 10 }}>{s.vol}</div>
              </div>
            ))}
            <div className="w-faint" style={{ fontSize: 10, padding: '6px 12px', textAlign: 'right', borderTop: `1px solid ${W.hairline}` }}>
              전체 보기 → <span style={{ marginLeft: 6 }}>21:30 NYSE 개장 시 자동 전환</span>
            </div>
          </div>
        </div>

        {/* NEWS + CALENDAR (symmetric 1:1) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="w-card" style={{ padding: 0 }}>
            <div className="w-row" style={{ justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${W.hairline}` }}>
              <div>
                <h2 className="w-h2">시장 핵심 뉴스</h2>
                <div className="w-faint" style={{ fontSize: 9, marginTop: 1 }}>편집팀 큐레이션 · 매크로 / 한국 / 미국</div>
              </div>
              <span className="w-pill" style={{ fontSize: 10 }}>최근 6h</span>
            </div>
            {news.map((n, i) => (
              <div key={i} style={{
                padding: '8px 12px',
                borderBottom: i < news.length - 1 ? `1px solid ${W.hairline}` : 'none',
              }}>
                <div className="w-row" style={{ gap: 8, alignItems: 'flex-start' }}>
                  <div style={{
                    padding: '1px 5px', textAlign: 'center', flexShrink: 0,
                    border: `1px solid ${catColor(n.cat)}`,
                    color: catColor(n.cat),
                    fontSize: 9, fontWeight: 600, borderRadius: 2, marginTop: 1,
                  }}>{catLabel(n.cat)}</div>
                  <div className="w-grow">
                    <div style={{ fontSize: 11.5, lineHeight: 1.35 }}>{n.t}</div>
                    <div className="w-faint" style={{ fontSize: 9.5, marginTop: 1 }}>{n.src} · {n.time}</div>
                  </div>
                </div>
                <div className="w-row" style={{ gap: 6, marginTop: 5, paddingLeft: 50, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="w-faint" style={{ fontSize: 9.5 }}>관련:</span>
                  {n.rel.map(t => (
                    <span key={t} className="w-mono" style={{ fontSize: 9.5, padding: '0 4px', border: `1px solid ${W.hairline}`, color: W.muted }}>{t}</span>
                  ))}
                  {n.impact !== '—' && (
                    <span className="w-faint" style={{ fontSize: 9.5, marginLeft: 4 }}>· 내 포지션 <b style={{ color: W.up }}>{n.impact}</b></span>
                  )}
                  <div className="w-grow" />
                  {n.mine ? (
                    <span style={{ fontSize: 9.5, color: W.accent, fontWeight: 600, cursor: 'pointer' }} onClick={() => openModal('note', { context: n.t.slice(0, 24) + '…' })}>✎ 내 해석 있음 →</span>
                  ) : (
                    <span style={{ fontSize: 9.5, color: W.faint, cursor: 'pointer' }} onClick={() => openModal('note', { context: n.t.slice(0, 24) + '…' })}>+ 해석 추가</span>
                  )}
                  <span className="w-faint" style={{ fontSize: 9.5, cursor: 'pointer' }} onClick={() => openModal('bookmark', { title: n.t.slice(0, 28) + '…' })}>저장</span>
                </div>
              </div>
            ))}
            <div className="w-faint" style={{ fontSize: 10, padding: '6px 12px', textAlign: 'right', borderTop: `1px solid ${W.hairline}` }}>
              리포트 메뉴 →
            </div>
          </div>

          <div className="w-card" style={{ padding: 0 }}>
            <div className="w-row" style={{ justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${W.hairline}` }}>
              <div>
                <h2 className="w-h2">내 캘린더</h2>
                <div className="w-faint" style={{ fontSize: 9, marginTop: 1 }}>시장 이벤트 + 내 종목 실적 · 배당</div>
              </div>
              <span className="w-pill" style={{ fontSize: 10 }}>2주</span>
            </div>
            {calendar.map((e, i) => (
              <div key={i} className="w-row" style={{
                padding: '7px 12px', gap: 8, alignItems: 'center',
                borderBottom: i < calendar.length - 1 ? `1px solid ${W.hairline}` : 'none',
              }}>
                <div style={{ width: 34, flexShrink: 0, textAlign: 'center' }}>
                  <div className="w-mono" style={{ fontSize: 8, color: W.muted, lineHeight: 1 }}>{e.day}</div>
                  <div className="w-mono" style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.1 }}>{e.d.split('/')[1]}</div>
                </div>
                <div className="w-vrule" style={{ height: 24 }} />
                <div className="w-grow">
                  <div style={{ fontSize: 11, lineHeight: 1.3 }}>{e.e}</div>
                  <div className="w-row" style={{ gap: 5, marginTop: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 8.5, padding: '0 4px',
                      border: `1px solid ${typeColor(e.type)}`,
                      color: typeColor(e.type),
                    }}>
                      {typeLabel(e.type)}
                    </span>
                    <div className="w-row" style={{ gap: 1 }}>
                      {[1, 2, 3].map(k => (
                        <div key={k} style={{ width: 3, height: 7, background: k <= e.imp ? W.ink : W.hairline }} />
                      ))}
                    </div>
                    {e.hold && (
                      <span className="w-faint" style={{ fontSize: 9.5 }}>· 보유 <b style={{ color: W.ink }}>{e.hold}</b></span>
                    )}
                    {e.memos > 0 && (
                      <span style={{ fontSize: 9.5, color: W.accent }}>· 메모 {e.memos}</span>
                    )}
                    {e.check && (
                      <span style={{ fontSize: 9.5, color: W.down }}>· 체크리스트 {e.check}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RETURNS vs MARKETS  |  PORTFOLIO COMPOSITION (symmetric 1:1) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="w-card" style={{ padding: 10 }}>
            <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
              <h2 className="w-h2">내 수익률 vs 시장</h2>
              <div className="w-row" style={{ gap: 3 }}>
                {['1D','1W','1M','3M','1Y','ALL'].map((p, i) => (
                  <span key={p} className="w-pill" style={{
                    fontSize: 10, padding: '1px 7px',
                    background: i === 3 ? W.ink : W.bg,
                    color: i === 3 ? '#fff' : W.muted,
                    borderColor: i === 3 ? W.ink : W.hairline,
                  }}>{p}</span>
                ))}
              </div>
            </div>
            <div className="w-rule" style={{ marginBottom: 6 }} />
            <div style={{ position: 'relative', width: '100%', height: 130 }}>
              <div style={{ position: 'absolute', inset: 0 }}>
                <AreaChart seed="home-portfolio" width={600} height={130} color={W.accent} />
              </div>
              <div style={{ position: 'absolute', inset: 0 }}>
                <AreaChart seed="home-kospi" width={600} height={130} color="#2c6fa5" fill={false} />
              </div>
              <div style={{ position: 'absolute', inset: 0 }}>
                <AreaChart seed="home-spx" width={600} height={130} color="#a55b2c" fill={false} />
              </div>
            </div>
            <div className="w-row" style={{ gap: 12, marginTop: 4, fontSize: 10, flexWrap: 'wrap' }}>
              <span className="w-row" style={{ gap: 4 }}><span style={{ width: 12, height: 2, background: W.accent }} /> 내 포트폴리오 <b style={{ color: W.up, marginLeft: 3 }}>+12.4%</b></span>
              <span className="w-row" style={{ gap: 4 }}><span style={{ width: 12, height: 2, background: '#2c6fa5' }} /> 🇰🇷 KOSPI <b style={{ marginLeft: 3 }}>+4.1%</b></span>
              <span className="w-row" style={{ gap: 4 }}><span style={{ width: 12, height: 2, background: '#a55b2c' }} /> 🇺🇸 S&P 500 <b style={{ marginLeft: 3 }}>+8.2%</b></span>
            </div>
            <div className="w-rule" style={{ margin: '8px 0 6px' }} />
            <div className="w-row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <div className="w-h3" style={{ fontSize: 10 }}>시장 대비 +4.2%p · 기여 요인</div>
              <span className="w-faint" style={{ fontSize: 9, cursor: 'pointer', color: W.accent }}>복기로 보내기 →</span>
            </div>
            {[
              { tk: 'NVDA',   nm: 'NVIDIA',   v: '+2.1%p', up: true,  why: 'AI 인프라 수요 지속' },
              { tk: '005930', nm: '삼성전자',  v: '+0.8%p', up: true,  why: 'HBM 모멘텀' },
              { tk: 'TSLA',   nm: 'Tesla',    v: '−0.4%p', up: false, why: 'Cybertruck 양산 지연' },
            ].map(c => (
              <div key={c.tk} className="w-row" style={{ gap: 6, fontSize: 10.5, padding: '2px 0' }}>
                <div className="w-mono" style={{ width: 56, fontWeight: 600 }}>{c.tk}</div>
                <div className="w-faint" style={{ width: 60 }}>{c.nm}</div>
                <div className="w-faint w-grow" style={{ fontSize: 10 }}>{c.why}</div>
                <div className={'w-mono ' + (c.up ? 'w-up' : 'w-down')} style={{ width: 50, textAlign: 'right', fontWeight: 600 }}>{c.v}</div>
              </div>
            ))}
            <div className="w-faint" style={{ fontSize: 10, marginTop: 6, lineHeight: 1.45, background: W.fill, padding: '6px 8px' }}>
              <b style={{ color: W.ink }}>학습 포인트.</b> AI 섹터 집중도가 수익률을 끌어올렸지만, 반도체 비중이 높아 변동성 리스크가 함께 커졌습니다.
            </div>
          </div>

          {/* Portfolio composition — donut + top holdings */}
          <div className="w-card" style={{ padding: 10 }}>
            <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
              <h2 className="w-h2">포트폴리오 구성</h2>
              <span className="w-faint" style={{ fontSize: 10 }}>국가 · 섹터 · 보유</span>
            </div>
            <div className="w-rule" style={{ marginBottom: 6 }} />
            <div className="w-row" style={{ gap: 14, alignItems: 'center' }}>
              {/* Donut */}
              <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
                <svg width="130" height="130" viewBox="0 0 130 130">
                  {(() => {
                    const segs = [
                      { v: 42, c: '#2c6fa5', label: '🇰🇷 한국주식' },
                      { v: 31, c: '#a55b2c', label: '🇺🇸 미국주식' },
                      { v: 14, c: W.accent, label: 'ETF' },
                      { v: 8,  c: '#7aa84a', label: '채권' },
                      { v: 5,  c: W.muted,  label: '현금' },
                    ];
                    let acc = -90;
                    const r = 52, cx = 65, cy = 65;
                    return segs.map((s, i) => {
                      const a1 = (acc) * Math.PI / 180;
                      const a2 = (acc + s.v * 3.6) * Math.PI / 180;
                      acc += s.v * 3.6;
                      const large = s.v > 50 ? 1 : 0;
                      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
                      const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
                      return <path key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={s.c} />;
                    });
                  })()}
                  <circle cx="65" cy="65" r="32" fill={W.bg} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div className="w-faint" style={{ fontSize: 9 }}>총 자산</div>
                  <div className="w-mono" style={{ fontSize: 13, fontWeight: 700 }}>4,821만</div>
                </div>
              </div>
              {/* Legend */}
              <div className="w-grow" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  { v: 42, c: '#2c6fa5', label: '🇰🇷 한국주식', n: '2,024만' },
                  { v: 31, c: '#a55b2c', label: '🇺🇸 미국주식', n: '1,494만' },
                  { v: 14, c: W.accent, label: 'ETF',         n: '675만'  },
                  { v: 8,  c: '#7aa84a', label: '채권',        n: '386만'  },
                  { v: 5,  c: W.muted,  label: '현금',        n: '241만'  },
                ].map((s) => (
                  <div key={s.label} className="w-row" style={{ gap: 6, alignItems: 'center', fontSize: 10.5 }}>
                    <div style={{ width: 10, height: 10, background: s.c, flexShrink: 0 }} />
                    <div className="w-grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</div>
                    <div className="w-mono" style={{ fontWeight: 600 }}>{s.v}%</div>
                    <div className="w-faint w-mono" style={{ width: 50, textAlign: 'right' }}>₩{s.n}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-rule" style={{ margin: '8px 0 6px' }} />
            <div className="w-row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <div className="w-h3" style={{ fontSize: 10 }}>상위 보유 (5)</div>
              <span className="w-faint" style={{ fontSize: 9 }}>비중 순</span>
            </div>
            {[
              { tk: '005930', nm: '삼성전자',   w: 18.2, chg: '+0.51%', up: true  },
              { tk: 'NVDA',   nm: 'NVIDIA',     w: 12.4, chg: '+3.42%', up: true  },
              { tk: 'AAPL',   nm: 'Apple',      w:  9.1, chg: '+1.24%', up: true  },
              { tk: '000660', nm: 'SK하이닉스', w:  7.6, chg: '−1.24%', up: false },
              { tk: 'QQQ',    nm: 'Invesco QQQ', w: 6.8, chg: '+0.42%', up: true  },
            ].map((h, i) => (
              <div key={h.tk} className="w-row" style={{ gap: 6, fontSize: 10.5, padding: '3px 0' }}>
                <div className="w-mono" style={{ minWidth: 48, fontWeight: 600 }}>{h.tk}</div>
                <div className="w-faint w-grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.nm}</div>
                <div style={{ width: 60, height: 6, background: W.hairline, position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, width: (h.w / 20 * 100) + '%', background: W.ink }} />
                </div>
                <div className="w-mono" style={{ width: 36, textAlign: 'right', fontWeight: 600 }}>{h.w}%</div>
                <div className={'w-mono ' + (h.up ? 'w-up' : 'w-down')} style={{ width: 48, textAlign: 'right' }}>{h.chg}</div>
              </div>
            ))}
          </div>
        </div>

        {/* HEATMAPS × 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { title: '🇰🇷 한국 시장 지도', sub: 'KOSPI 시총 가중', seed: 1 },
            { title: '🇺🇸 미국 시장 지도', sub: 'S&P 500 시총 가중', seed: 7 },
          ].map((hm) => (
            <div key={hm.title} className="w-card" style={{ padding: 10 }}>
              <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <h2 className="w-h2">{hm.title}</h2>
                <span className="w-faint" style={{ fontSize: 10 }}>{hm.sub}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gridAutoRows: 16, gap: 1 }}>
                {Array.from({ length: 60 }).map((_, i) => {
                  const v = ((i * hm.seed + hm.seed * 3) % 7 - 3) / 3;
                  const up = v >= 0;
                  const intensity = Math.abs(v);
                  const c = up
                    ? `rgba(31,138,91,${0.15 + intensity * 0.45})`
                    : `rgba(211,65,65,${0.15 + intensity * 0.45})`;
                  return <div key={i} style={{
                    background: c,
                    gridRow: i === 0 ? 'span 2' : i === 5 ? 'span 2' : 'span 1',
                    gridColumn: i === 0 ? 'span 2' : 'span 1',
                  }} />;
                })}
              </div>
              <div className="w-row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                <div className="w-faint" style={{ fontSize: 9 }}>
                  <span style={{ color: W.up }}>●</span> 상승 <span style={{ color: W.down, marginLeft: 8 }}>●</span> 하락
                </div>
                <div className="w-faint" style={{ fontSize: 10 }}>전체 보기 →</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.WireHome = WireHome;
