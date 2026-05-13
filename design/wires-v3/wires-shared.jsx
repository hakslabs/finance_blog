// Shared wireframe primitives — low-fi, monochrome, intentionally rough.
// Design vocabulary: 1px stroke, dashed lines for "image/chart goes here",
// grayscale fills, single accent color used VERY sparingly for important
// CTAs. Korean UI labels, English tickers/indices.
//
// This is a wireframe, not hi-fi. Resist the urge to add color/polish.

const W = {
  bg: '#ffffff',
  ink: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#a8a8a8',
  line: '#1a1a1a',
  hairline: '#d4d4d4',
  fill: '#f3f3f1',
  fillAlt: '#e8e8e5',
  accent: '#2a6fdb',     // toss-ish blue, used very sparingly
  up: '#1f8a5b',
  down: '#d34141',
  font: '"Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  mono: '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
};

if (typeof document !== 'undefined' && !document.getElementById('w-styles')) {
  const s = document.createElement('style');
  s.id = 'w-styles';
  s.textContent = `
    .w-root { font-family: ${W.font}; color: ${W.ink}; background: ${W.bg};
      font-size: 13px; line-height: 1.4; height: 100%; box-sizing: border-box;
      display: flex; flex-direction: column; }
    .w-root *, .w-root *::before, .w-root *::after { box-sizing: border-box; }
    .w-mono { font-family: ${W.mono}; font-variant-numeric: tabular-nums; }
    .w-up { color: ${W.up}; }
    .w-down { color: ${W.down}; }
    .w-muted { color: ${W.muted}; }
    .w-faint { color: ${W.faint}; }
    .w-rule { height: 1px; background: ${W.hairline}; }
    .w-vrule { width: 1px; background: ${W.hairline}; align-self: stretch; }
    .w-card { border: 1px solid ${W.line}; background: ${W.bg}; }
    .w-card-soft { border: 1px solid ${W.hairline}; background: ${W.bg}; }
    .w-tag { display: inline-block; border: 1px solid ${W.line}; padding: 1px 6px;
      font-size: 10px; line-height: 1.4; letter-spacing: 0.04em; text-transform: uppercase; }
    .w-pill { display: inline-block; border: 1px solid ${W.hairline}; padding: 2px 8px;
      border-radius: 999px; font-size: 11px; color: ${W.muted}; }
    .w-btn { display: inline-flex; align-items: center; justify-content: center;
      border: 1px solid ${W.line}; padding: 6px 12px; background: ${W.bg};
      font: inherit; font-size: 12px; cursor: pointer; }
    .w-btn-primary { background: ${W.ink}; color: #fff; border-color: ${W.ink}; }
    .w-btn-accent { background: ${W.accent}; color: #fff; border-color: ${W.accent}; }
    .w-btn-ghost { border: 1px solid ${W.hairline}; color: ${W.muted}; }
    .w-input { border: 1px solid ${W.hairline}; padding: 6px 10px; font: inherit;
      font-size: 12px; background: ${W.bg}; }
    .w-checkbox { width: 12px; height: 12px; border: 1px solid ${W.line};
      display: inline-block; vertical-align: middle; }
    .w-radio { width: 12px; height: 12px; border: 1px solid ${W.line}; border-radius: 50%;
      display: inline-block; vertical-align: middle; }
    .w-dashed { background-color: ${W.fill};
      background-image: repeating-linear-gradient(45deg, transparent 0, transparent 6px,
        ${W.hairline} 6px, ${W.hairline} 7px);
      border: 1px dashed ${W.faint}; color: ${W.muted}; display: flex;
      align-items: center; justify-content: center; font-size: 11px; text-align: center;
      padding: 8px; }
    .w-h1 { font-size: 17px; font-weight: 700; letter-spacing: -0.01em; margin: 0; }
    .w-h2 { font-size: 14px; font-weight: 600; letter-spacing: -0.005em; margin: 0; }
    .w-h3 { font-size: 12px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.06em; color: ${W.muted}; margin: 0; }
    .w-num-lg { font-family: ${W.mono}; font-size: 22px; font-weight: 600;
      letter-spacing: -0.02em; }
    .w-num-md { font-family: ${W.mono}; font-size: 15px; font-weight: 600; }
    .w-row { display: flex; align-items: center; }
    .w-col { display: flex; flex-direction: column; }
    .w-grow { flex: 1 1 auto; min-width: 0; }
    .w-scroll { overflow: hidden; }
  `;
  document.head.appendChild(s);
}

// Sparkline — randomized but seeded by a string so it's stable across renders.
function Sparkline({ seed = 'x', up = true, width = 60, height = 18, stroke }) {
  const rng = (() => {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return () => { h = Math.imul(h ^ (h >>> 13), 16777619); return ((h >>> 0) / 4294967296); };
  })();
  const n = 24;
  const pts = [];
  let v = 50;
  for (let i = 0; i < n; i++) {
    v += (rng() - 0.5) * 14 + (up ? 0.7 : -0.7);
    v = Math.max(8, Math.min(92, v));
    pts.push(v);
  }
  const path = pts.map((y, i) => {
    const x = (i / (n - 1)) * width;
    const yy = height - (y / 100) * height;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yy.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <path d={path} fill="none" stroke={stroke || (up ? W.up : W.down)} strokeWidth="1.2" />
    </svg>
  );
}

// Candle chart placeholder. Generates seeded OHLC bars.
function CandleChart({ seed = 'c', width, height, bars = 60, showGrid = true }) {
  const rng = (() => {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 13), 16777619); return ((h >>> 0) / 4294967296); };
  })();
  const data = [];
  let last = 100;
  for (let i = 0; i < bars; i++) {
    const drift = (rng() - 0.48) * 4;
    const open = last;
    const close = Math.max(20, open + drift + (rng() - 0.5) * 3);
    const high = Math.max(open, close) + rng() * 2;
    const low = Math.min(open, close) - rng() * 2;
    data.push({ open, close, high, low });
    last = close;
  }
  const max = Math.max(...data.map(d => d.high));
  const min = Math.min(...data.map(d => d.low));
  const pad = (max - min) * 0.05;
  const range = (max - min) + pad * 2;
  const y = v => height - ((v - min + pad) / range) * height;
  const bw = (width / bars) * 0.7;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {showGrid && [0.25, 0.5, 0.75].map(p => (
        <line key={p} x1="0" x2={width} y1={height * p} y2={height * p}
          stroke={W.hairline} strokeWidth="0.5" strokeDasharray="2,3" />
      ))}
      {data.map((d, i) => {
        const cx = (i + 0.5) * (width / bars);
        const up = d.close >= d.open;
        const c = up ? W.up : W.down;
        return (
          <g key={i}>
            <line x1={cx} x2={cx} y1={y(d.high)} y2={y(d.low)} stroke={c} strokeWidth="0.8" />
            <rect x={cx - bw / 2} y={y(Math.max(d.open, d.close))}
              width={bw} height={Math.max(0.5, Math.abs(y(d.open) - y(d.close)))}
              fill={up ? W.bg : c} stroke={c} strokeWidth="0.8" />
          </g>
        );
      })}
    </svg>
  );
}

// Area chart placeholder.
function AreaChart({ seed = 'a', width, height, points = 80, color = W.line, fill = true }) {
  const rng = (() => {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 13), 16777619); return ((h >>> 0) / 4294967296); };
  })();
  const pts = [];
  let v = 50;
  for (let i = 0; i < points; i++) {
    v += (rng() - 0.45) * 6;
    v = Math.max(5, Math.min(95, v));
    pts.push(v);
  }
  const path = pts.map((y, i) => {
    const x = (i / (points - 1)) * width;
    const yy = height - (y / 100) * height;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yy.toFixed(1)}`;
  }).join(' ');
  const area = path + ` L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {fill && <path d={area} fill={color} fillOpacity="0.08" />}
      <path d={path} fill="none" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}

// Bar chart placeholder.
function BarChart({ seed = 'b', width, height, bars = 20, color = W.ink }) {
  const rng = (() => {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 13), 16777619); return ((h >>> 0) / 4294967296); };
  })();
  const vals = [];
  for (let i = 0; i < bars; i++) {
    const sign = rng() > 0.5 ? 1 : -1;
    vals.push(sign * (0.2 + rng() * 0.8));
  }
  const max = Math.max(...vals.map(Math.abs));
  const bw = (width / bars) * 0.72;
  const mid = height / 2;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <line x1="0" x2={width} y1={mid} y2={mid} stroke={W.hairline} strokeWidth="0.5" />
      {vals.map((v, i) => {
        const cx = (i + 0.5) * (width / bars);
        const h = (Math.abs(v) / max) * (mid - 4);
        const up = v >= 0;
        return (
          <rect key={i} x={cx - bw / 2} y={up ? mid - h : mid}
            width={bw} height={h}
            fill={up ? W.up : W.down} opacity="0.7" />
        );
      })}
    </svg>
  );
}

// Generic dashed placeholder box
function Placeholder({ label, height, width = '100%', style }) {
  return (
    <div className="w-dashed" style={{ width, height, ...style }}>
      {label}
    </div>
  );
}

// Nav context — when a WirePrimary parent provides a setActive fn, AppBar tabs
// become clickable and switch the rendered screen. Without provider: no-op.
const NavContext = React.createContext({ active: null, setActive: null });

// Top app bar shared by all logged-in screens.
// v2: Korean-friendly menu labels + Star quick-access + Bell notifications + Profile menu.
// v3.1: optional clickable tabs via NavContext.
function AppBar({ active = 'home' }) {
  const items = [
    { id: 'home', label: '홈', en: 'Home' },
    { id: 'analysis', label: '분석', en: 'Analysis' },
    { id: 'screener', label: '종목 검색', en: 'Screener' },
    { id: 'masters', label: '고수 따라잡기', en: 'Masters' },
    { id: 'reports', label: '리포트', en: 'Reports' },
    { id: 'learn', label: '학습', en: 'Learn' },
    { id: 'portfolio', label: '포트폴리오', en: 'Portfolio' },
  ];
  const ctx = React.useContext(NavContext);
  // Normalize: `active` prop may be id ('home'), Korean label ('홈'), or English ('Home').
  const resolvedActive = ctx.active || items.find(it =>
    it.id === active || it.label === active || it.en === active
  )?.id || active;
  const clickable = !!ctx.setActive;
  return (
    <div className="w-row" style={{ height: 48, borderBottom: `1px solid ${W.line}`, padding: '0 16px', gap: 16, flexShrink: 0 }}>
      <div className="w-row" style={{ gap: 8 }}>
        <div style={{ width: 18, height: 18, border: `1.5px solid ${W.line}`, transform: 'rotate(45deg)' }} />
        <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em' }}>STOCKLAB</div>
      </div>
      <div className="w-row" style={{ gap: 2, marginLeft: 12 }}>
        {items.map(it => {
          const isActive = it.id === resolvedActive;
          return (
            <div key={it.id}
              onClick={clickable ? () => ctx.setActive(it.id) : undefined}
              style={{
                padding: '6px 10px', fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? W.ink : W.muted,
                borderBottom: isActive ? `2px solid ${W.ink}` : '2px solid transparent',
                position: 'relative', top: 1, whiteSpace: 'nowrap',
                cursor: clickable ? 'pointer' : 'default',
                userSelect: 'none',
              }}>
              {it.label} <span className="w-faint" style={{ fontSize: 10 }}>{it.en}</span>
            </div>
          );
        })}
      </div>
      <div className="w-grow" />
      <div className="w-row" style={{ gap: 8 }}>
        <div className="w-input w-row" style={{ width: 200, gap: 6 }}>
          <span className="w-faint" style={{ fontSize: 11 }}>⌕</span>
          <span className="w-faint">종목 / 티커 검색</span>
        </div>
        <div className="w-pill">KRW</div>
        {/* ★ quick-access dropdown trigger */}
        <div title="관심종목 · 팔로우 · 북마크" style={{
          width: 28, height: 28, border: `1px solid ${W.hairline}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, color: W.muted,
        }}>★</div>
        {/* 🔔 notifications with unread dot */}
        <div title="알림" style={{
          width: 28, height: 28, border: `1px solid ${W.hairline}`, position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, color: W.muted,
        }}>
          <span>🔔</span>
          <span style={{
            position: 'absolute', top: 4, right: 5, width: 6, height: 6,
            borderRadius: '50%', background: W.down,
          }} />
        </div>
        {/* Profile avatar */}
        <div style={{ width: 28, height: 28, border: `1px solid ${W.hairline}`, borderRadius: '50%' }} />
      </div>
    </div>
  );
}

// Compact dropdown panels rendered as floating cards beside the AppBar — used in IA / overview
// to *show* the menus rather than make them interactive. Wireframe artifacts only.
function StarDropdownPreview() {
  return (
    <div className="w-card" style={{ width: 240, fontSize: 11, padding: 0 }}>
      <div style={{ padding: '8px 10px', borderBottom: `1px solid ${W.hairline}`, fontWeight: 600 }}>
        ★ 빠른 접근
      </div>
      <div className="w-col" style={{ padding: '6px 0' }}>
        <div style={{ padding: '4px 10px', color: W.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>관심종목 (12)</div>
        {['AAPL · 178.32', '005930 삼성전자', 'NVDA · 920.10', 'TSLA · 218.45'].map(t => (
          <div key={t} className="w-row" style={{ padding: '4px 10px', justifyContent: 'space-between' }}>
            <span>{t}</span><span className="w-faint">→</span>
          </div>
        ))}
        <div className="w-rule" style={{ margin: '4px 0' }} />
        <div style={{ padding: '4px 10px', color: W.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>팔로우하는 고수 (3)</div>
        <div style={{ padding: '4px 10px' }}>Buffett · Munger · Lynch</div>
        <div className="w-rule" style={{ margin: '4px 0' }} />
        <div style={{ padding: '4px 10px', color: W.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>북마크 용어 (8)</div>
        <div style={{ padding: '4px 10px' }}>PER · ROE · DCF · 베타…</div>
        <div className="w-rule" style={{ margin: '4px 0' }} />
        <div style={{ padding: '6px 10px', color: W.accent, fontWeight: 600 }}>마이페이지에서 관리 →</div>
      </div>
    </div>
  );
}

function ProfileDropdownPreview({ admin = false }) {
  return (
    <div className="w-card" style={{ width: 200, fontSize: 11, padding: 0 }}>
      <div style={{ padding: '10px', borderBottom: `1px solid ${W.hairline}` }}>
        <div style={{ fontWeight: 600 }}>홍길동</div>
        <div className="w-faint" style={{ fontSize: 10 }}>hong@example.com</div>
      </div>
      <div className="w-col" style={{ padding: '4px 0' }}>
        {[
          '마이페이지',
          '계정 설정',
          '거래 내역',
          '내 메모 / 일지',
          '알림 설정',
        ].map(t => (
          <div key={t} style={{ padding: '5px 10px' }}>{t}</div>
        ))}
        {admin && (
          <>
            <div className="w-rule" style={{ margin: '4px 0' }} />
            <div style={{ padding: '5px 10px', color: W.accent, fontWeight: 600 }}>
              관리자 대시보드
            </div>
          </>
        )}
        <div className="w-rule" style={{ margin: '4px 0' }} />
        <div style={{ padding: '5px 10px', color: W.muted }}>로그아웃</div>
      </div>
    </div>
  );
}

Object.assign(window, { W, Sparkline, CandleChart, AreaChart, Placeholder, AppBar,
  NavContext, StarDropdownPreview, ProfileDropdownPreview });
