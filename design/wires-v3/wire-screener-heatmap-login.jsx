// Screener — 팩터 스크리너 + 결과 테이블
// Heatmap — Finviz 스타일 트리맵
// Login — 인증 화면

function WireScreener() {
  return (
    <div className="w-root">
      <AppBar active="screener" />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        <div className="w-row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h1 className="w-h1">스크리너</h1>
            <div className="w-faint" style={{ fontSize: 11, marginTop: 2 }}>팩터 필터로 종목 발굴 — KR + US 통합</div>
          </div>
          <div className="w-row" style={{ gap: 6 }}>
            <button className="w-btn-ghost w-btn">불러오기</button>
            <button className="w-btn">스크린 저장</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 12 }}>
          {/* Filters */}
          <div className="w-card" style={{ padding: 12 }}>
            <h2 className="w-h2" style={{ marginBottom: 8 }}>필터</h2>
            <div className="w-rule" style={{ marginBottom: 10 }} />
            <div className="w-col" style={{ gap: 12 }}>
              <div>
                <div className="w-h3" style={{ fontSize: 9, marginBottom: 4 }}>시장</div>
                <div className="w-row" style={{ gap: 4, flexWrap: 'wrap' }}>
                  {['KOSPI', 'KOSDAQ', 'NYSE', 'NASDAQ'].map((m, i) => (
                    <span key={m} className="w-pill" style={{ background: i < 2 ? W.fill : W.bg }}>{m}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="w-h3" style={{ fontSize: 9, marginBottom: 4 }}>섹터</div>
                <div className="w-input">전체 (선택)</div>
              </div>
              {[
                ['시가총액', '$1B', '$500B'],
                ['PER', '0', '20'],
                ['PBR', '0', '3'],
                ['ROE (%)', '12', '50'],
                ['부채비율 (%)', '0', '70'],
                ['배당수익률 (%)', '0', '10'],
                ['6M 수익률 (%)', '−20', '100'],
              ].map((f, i) => (
                <div key={i}>
                  <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="w-h3" style={{ fontSize: 9 }}>{f[0]}</span>
                    <span className="w-mono w-faint" style={{ fontSize: 10 }}>{f[1]} – {f[2]}</span>
                  </div>
                  <div style={{ position: 'relative', height: 4, background: W.fill }}>
                    <div style={{ position: 'absolute', left: '15%', right: '20%', top: 0, bottom: 0, background: W.ink }} />
                    <div style={{ position: 'absolute', left: '15%', top: -3, width: 10, height: 10, background: W.bg, border: `1.5px solid ${W.ink}`, borderRadius: '50%' }} />
                    <div style={{ position: 'absolute', right: '20%', top: -3, width: 10, height: 10, background: W.bg, border: `1.5px solid ${W.ink}`, borderRadius: '50%' }} />
                  </div>
                </div>
              ))}
              <div>
                <div className="w-h3" style={{ fontSize: 9, marginBottom: 4 }}>퀀트 팩터</div>
                {['모멘텀 상위 30%', '퀄리티 상위 30%', '저변동성', '배당 그로스'].map((p, i) => (
                  <div key={p} className="w-row" style={{ gap: 6, padding: '3px 0', fontSize: 11 }}>
                    <span className="w-checkbox" style={{ background: i < 2 ? W.ink : W.bg }} />
                    <span>{p}</span>
                  </div>
                ))}
              </div>
              <button className="w-btn-primary w-btn" style={{ width: '100%', marginTop: 4 }}>필터 적용 (148)</button>
            </div>
          </div>

          {/* Results */}
          <div className="w-card" style={{ padding: 12 }}>
            <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <h2 className="w-h2">결과 <span className="w-faint" style={{ fontSize: 11, fontWeight: 400 }}>· 148개 종목</span></h2>
              <div className="w-row" style={{ gap: 6 }}>
                <span className="w-pill">표</span>
                <span className="w-pill" style={{ background: W.fill }}>히트맵</span>
                <span className="w-pill">차트</span>
              </div>
            </div>
            <div className="w-rule" />
            <div style={{
              display: 'grid',
              gridTemplateColumns: '40px 1.4fr 0.8fr 0.7fr 0.7fr 0.7fr 0.7fr 0.7fr 0.7fr 0.7fr',
              fontSize: 10, color: W.muted, padding: '8px 0', borderBottom: `1px solid ${W.hairline}`,
              textTransform: 'uppercase', letterSpacing: '0.06em'
            }}>
              <div></div><div>종목</div><div style={{ textAlign: 'right' }}>현재가</div>
              <div style={{ textAlign: 'right' }}>1D</div><div style={{ textAlign: 'right' }}>PER</div>
              <div style={{ textAlign: 'right' }}>PBR</div><div style={{ textAlign: 'right' }}>ROE</div>
              <div style={{ textAlign: 'right' }}>모멘텀</div><div style={{ textAlign: 'right' }}>퀄리티</div>
              <div style={{ textAlign: 'right' }}>점수</div>
            </div>
            {[
              ['META', 'Meta Platforms', '484.10', '+1.2%', '24.1', '7.2', '32.4', 84, 92, 88, true],
              ['GOOGL', 'Alphabet', '171.40', '+0.8%', '22.8', '6.4', '28.1', 76, 90, 83, true],
              ['BRK.B', 'Berkshire Hathaway', '420.10', '+0.4%', '14.2', '1.6', '12.4', 52, 88, 70, true],
              ['ASML', 'ASML Holding', '912.40', '−0.6%', '34.2', '14.8', '52.1', 71, 95, 82, false],
              ['AVGO', 'Broadcom', '1480.20', '+2.1%', '38.4', '12.1', '42.8', 88, 90, 89, true],
              ['LLY', 'Eli Lilly', '824.10', '+1.6%', '78.2', '52.4', '54.8', 92, 84, 88, true],
              ['005930', '삼성전자', '78,400', '+0.5%', '12.4', '1.4', '11.2', 48, 76, 62, true],
              ['000660', 'SK하이닉스', '198,500', '−1.2%', '8.2', '1.8', '24.2', 72, 78, 75, false],
            ].map((r, i) => (
              <div key={r[0]} style={{
                display: 'grid',
                gridTemplateColumns: '40px 1.4fr 0.8fr 0.7fr 0.7fr 0.7fr 0.7fr 0.7fr 0.7fr 0.7fr',
                alignItems: 'center', padding: '8px 0', borderBottom: i < 7 ? `1px solid ${W.hairline}` : 'none', fontSize: 11,
              }}>
                <span className="w-faint">★</span>
                <div>
                  <div className="w-mono" style={{ fontWeight: 600 }}>{r[0]}</div>
                  <div className="w-faint" style={{ fontSize: 10 }}>{r[1]}</div>
                </div>
                <div className="w-mono" style={{ textAlign: 'right' }}>{r[2]}</div>
                <div className={'w-mono ' + (r[10] ? 'w-up' : 'w-down')} style={{ textAlign: 'right' }}>{r[3]}</div>
                <div className="w-mono" style={{ textAlign: 'right' }}>{r[4]}</div>
                <div className="w-mono" style={{ textAlign: 'right' }}>{r[5]}</div>
                <div className="w-mono" style={{ textAlign: 'right' }}>{r[6]}</div>
                <div className="w-mono" style={{ textAlign: 'right' }}>{r[7]}</div>
                <div className="w-mono" style={{ textAlign: 'right' }}>{r[8]}</div>
                <div className="w-mono" style={{ textAlign: 'right', fontWeight: 700, color: r[9] >= 80 ? W.up : W.ink }}>{r[9]}</div>
              </div>
            ))}
            <div className="w-row" style={{ justifyContent: 'center', marginTop: 12, gap: 6 }}>
              {['‹', '1', '2', '3', '4', '…', '19', '›'].map((p, i) => (
                <span key={i} className="w-pill" style={{ background: i === 1 ? W.ink : W.bg, color: i === 1 ? '#fff' : W.muted, borderColor: i === 1 ? W.ink : W.hairline }}>{p}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WireHeatmap() {
  const [openTk, setOpenTk] = React.useState(null);
  if (openTk) {
    return (
      <div className="w-root">
        <div className="w-row" style={{ height: 36, borderBottom: `1px solid ${W.line}`, padding: '0 14px', gap: 12, flexShrink: 0, background: W.fill }}>
          <span onClick={() => setOpenTk(null)} style={{ cursor: 'pointer', fontSize: 12, color: W.accent }}>← 시장 지도로</span>
          <span className="w-faint" style={{ fontSize: 11 }}>· 종목 상세 진입 · {openTk}</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <WireStockDetail />
        </div>
      </div>
    );
  }
  // Finviz-style treemap of S&P 500 — sectors as super-cells, individual stocks inside
  const sectors = [
    { n: 'IT', cols: 6, rows: 4, stocks: [
      ['AAPL', 18, '+1.2'], ['MSFT', 16, '+0.8'], ['NVDA', 14, '+3.4'], ['GOOGL', 9, '+0.4'],
      ['META', 7, '+1.6'], ['AVGO', 5, '+2.1'], ['ORCL', 3, '−0.4'], ['CRM', 3, '+0.2'],
    ]},
    { n: '금융', cols: 4, rows: 3, stocks: [
      ['BRK.B', 12, '+0.4'], ['JPM', 8, '−0.2'], ['V', 6, '+0.8'], ['MA', 5, '+0.6'], ['BAC', 4, '−1.1'],
    ]},
    { n: '헬스', cols: 4, rows: 3, stocks: [
      ['LLY', 10, '+1.6'], ['UNH', 7, '−0.8'], ['JNJ', 5, '0.0'], ['ABBV', 4, '+0.4'], ['MRK', 4, '−1.2'],
    ]},
    { n: '소비순환', cols: 3, rows: 3, stocks: [
      ['AMZN', 12, '+0.6'], ['TSLA', 6, '−2.1'], ['HD', 4, '+0.4'],
    ]},
    { n: '에너지', cols: 3, rows: 2, stocks: [['XOM', 6, '+1.2'], ['CVX', 4, '−0.8'], ['COP', 3, '+0.4']]},
    { n: '통신', cols: 3, rows: 2, stocks: [['NFLX', 5, '+0.8'], ['DIS', 3, '−1.4'], ['T', 2, '−0.2']]},
  ];
  const colorFor = (chg) => {
    const v = parseFloat(chg);
    const i = Math.min(0.65, Math.abs(v) * 0.18 + 0.1);
    return v >= 0 ? `rgba(31,138,91,${i})` : `rgba(211,65,65,${i})`;
  };
  return (
    <div className="w-root">
      <AppBar active="screener" />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        <div className="w-row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h1 className="w-h1">시장 히트맵</h1>
            <div className="w-faint" style={{ fontSize: 11, marginTop: 2 }}>시총 가중 트리맵 · 셀 크기 = 시총, 색 = 일간 등락률</div>
          </div>
          <div className="w-row" style={{ gap: 6 }}>
            <span className="w-pill" style={{ background: W.fill }}>S&P 500</span>
            <span className="w-pill">NASDAQ 100</span>
            <span className="w-pill">KOSPI 200</span>
            <div className="w-vrule" style={{ height: 18, margin: '0 6px' }} />
            <span className="w-pill" style={{ background: W.fill }}>1D</span>
            <span className="w-pill">1W</span>
            <span className="w-pill">1M</span>
            <span className="w-pill">YTD</span>
          </div>
        </div>

        <div className="w-card" style={{ padding: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridAutoRows: 60, gap: 2 }}>
            {sectors.map((sec, si) => (
              <div key={sec.n} style={{
                gridColumn: `span ${sec.cols}`, gridRow: `span ${sec.rows}`,
                border: `1px solid ${W.line}`, position: 'relative', display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ padding: '2px 6px', fontSize: 10, fontWeight: 600, borderBottom: `1px solid ${W.hairline}`, background: W.bg }}>
                  {sec.n}
                </div>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1, padding: 1 }}>
                  {sec.stocks.map((s, i) => (
                    <div key={s[0]} onClick={() => setOpenTk(s[0])} style={{
                      gridColumn: `span ${Math.max(1, Math.round(s[1] / 3))}`,
                      gridRow: 'span 1',
                      background: colorFor(s[2]),
                      padding: '2px 4px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                      fontSize: 10, color: W.ink, overflow: 'hidden',
                    }}>
                      <div className="w-mono" style={{ fontWeight: 700, fontSize: 11 }}>{s[0]}</div>
                      <div className="w-mono" style={{ fontSize: 9, opacity: 0.7 }}>{s[2]}%</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="w-row" style={{ justifyContent: 'center', marginTop: 10, gap: 4, fontSize: 10 }}>
            <span className="w-down">−5%</span>
            {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map(v => (
              <div key={v} style={{ width: 24, height: 10, background: colorFor(String(v)) }} />
            ))}
            <span className="w-up">+5%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WireLogin() {
  return (
    <div className="w-root" style={{ background: W.bg }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div className="w-card" style={{ width: 360, padding: 32 }}>
          <div className="w-row" style={{ gap: 8, marginBottom: 24, justifyContent: 'center' }}>
            <div style={{ width: 22, height: 22, border: `1.5px solid ${W.line}`, transform: 'rotate(45deg)' }} />
            <div style={{ fontWeight: 700, fontSize: 16 }}>STOCKLAB</div>
          </div>
          <h1 className="w-h1" style={{ textAlign: 'center', fontSize: 18, marginBottom: 4 }}>다시 만나서 반가워요</h1>
          <div className="w-muted" style={{ textAlign: 'center', fontSize: 12, marginBottom: 24 }}>계정으로 로그인하고 포트폴리오를 이어서 관리하세요</div>

          <div className="w-col" style={{ gap: 10 }}>
            <div>
              <div className="w-h3" style={{ fontSize: 9, marginBottom: 4 }}>이메일</div>
              <div className="w-input" style={{ width: '100%' }}>you@example.com</div>
            </div>
            <div>
              <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                <span className="w-h3" style={{ fontSize: 9 }}>비밀번호</span>
                <span className="w-faint" style={{ fontSize: 10 }}>잊으셨나요?</span>
              </div>
              <div className="w-input" style={{ width: '100%' }}>••••••••</div>
            </div>
            <div className="w-row" style={{ gap: 6, marginTop: 4 }}>
              <span className="w-checkbox" style={{ background: W.ink }} />
              <span style={{ fontSize: 11 }}>로그인 상태 유지</span>
            </div>
            <button className="w-btn-primary w-btn" style={{ width: '100%', marginTop: 8, padding: '10px 16px' }}>로그인</button>
            <div className="w-row" style={{ alignItems: 'center', gap: 10, margin: '8px 0' }}>
              <div className="w-rule w-grow" />
              <span className="w-faint" style={{ fontSize: 10 }}>또는</span>
              <div className="w-rule w-grow" />
            </div>
            <button className="w-btn" style={{ width: '100%', padding: '8px 12px' }}>Google로 계속하기</button>
            <button className="w-btn" style={{ width: '100%', padding: '8px 12px' }}>Apple로 계속하기</button>
            <button className="w-btn" style={{ width: '100%', padding: '8px 12px' }}>카카오로 계속하기</button>
          </div>

          <div className="w-faint" style={{ textAlign: 'center', fontSize: 11, marginTop: 20 }}>
            계정이 없으신가요? <span style={{ color: W.accent }}>회원가입</span>
          </div>
        </div>
      </div>
      <div className="w-faint" style={{ textAlign: 'center', fontSize: 10, padding: 12, borderTop: `1px solid ${W.hairline}` }}>
        © 2026 STOCKLAB · 본 사이트의 모든 시세는 참고용이며 투자 판단의 책임은 사용자에게 있습니다
      </div>
    </div>
  );
}

window.WireScreener = WireScreener;
window.WireHeatmap = WireHeatmap;
window.WireLogin = WireLogin;
