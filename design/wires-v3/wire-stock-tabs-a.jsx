// Stock Detail sub-tabs A — 개요 / 차트 / 재무 / 밸류
// 각 탭의 레이아웃이 다르므로 별도 풀화면 와이어로 분리

const STK_HEADER = ({ tabActive }) => {
  const tabs = ['개요', '차트', '재무', '적정가치', '공시·실적', '뉴스', '수급', '목표주가'];
  return (
    <div style={{ borderBottom: `1px solid ${W.hairline}` }}>
      <div className="w-row" style={{ padding: '12px 16px 8px', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 48, height: 48, border: `1px solid ${W.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>N</div>
        <div className="w-grow">
          <div className="w-row" style={{ gap: 8, alignItems: 'baseline' }}>
            <h1 className="w-h1">NVIDIA Corporation</h1>
            <span className="w-mono w-faint" style={{ fontSize: 12 }}>NVDA · NASDAQ</span>
            <span className="w-pill" style={{ fontSize: 9 }}>반도체</span>
          </div>
          <div className="w-row" style={{ gap: 12, marginTop: 4, alignItems: 'baseline' }}>
            <span className="w-num-md">$148.20</span>
            <span className="w-mono w-up" style={{ fontSize: 12 }}>+2.34 (+1.61%)</span>
            <span className="w-faint" style={{ fontSize: 10 }}>· 14:32 EST · 시총 $3.65T</span>
          </div>
        </div>
        <button className="w-btn">★ 관심</button>
        <button className="w-btn">📝 메모</button>
        <button className="w-btn-primary w-btn">+ 거래 추가</button>
      </div>
      <div className="w-row" style={{ padding: '0 16px', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <div key={t} style={{
            padding: '8px 14px', fontSize: 12, cursor: 'pointer',
            fontWeight: t === tabActive ? 600 : 400, color: t === tabActive ? W.ink : W.muted,
            borderBottom: t === tabActive ? `2px solid ${W.ink}` : '2px solid transparent',
          }}>{t}</div>
        ))}
      </div>
    </div>
  );
};

// Tab 1 — 개요 (요약 카드 모음)
function WireStockOverview() {
  return (
    <div className="w-root">
      <AppBar active="" />
      <STK_HEADER tabActive="개요" />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12 }}>
          <div className="w-card" style={{ padding: 12 }}>
            <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <h2 className="w-h2">가격 차트 · 1Y</h2>
              <div className="w-row" style={{ gap: 4 }}>
                {['1D','1W','1M','3M','1Y','5Y','전체'].map((t,i) => (
                  <span key={t} className="w-pill" style={{ background: i === 4 ? W.fill : W.bg }}>{t}</span>
                ))}
              </div>
            </div>
            <div className="w-rule" style={{ marginBottom: 8 }} />
            <AreaChart seed="ovw-chart" width={760} height={200} color={W.up} />
          </div>
          <div className="w-col" style={{ gap: 12 }}>
            <div className="w-card" style={{ padding: 12 }}>
              <h2 className="w-h2" style={{ marginBottom: 8 }}>핵심 지표</h2>
              <div className="w-rule" style={{ marginBottom: 8 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
                {[['PER','55.4'],['PBR','42.1'],['ROE','91.5%'],['배당수익률','0.03%'],['EPS','$2.34'],['시가총액','$3.65T'],['52주 고가','$152.89'],['52주 저가','$74.20'],['베타','1.68'],['거래량','198M']].map(([l,v]) => (
                  <div key={l}>
                    <div className="w-faint" style={{ fontSize: 10 }}>{l}</div>
                    <div className="w-mono" style={{ fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-card" style={{ padding: 12 }}>
              <h2 className="w-h2" style={{ marginBottom: 8 }}>기술 신호 (자동)</h2>
              <div className="w-rule" style={{ marginBottom: 6 }} />
              <div className="w-col" style={{ gap: 4, fontSize: 11 }}>
                {[['골든크로스 (MA20/60)', W.up],['RSI 78 · 과매수', W.down],['거래량 +320%', W.up],['52주 신고가 근접', W.muted]].map(([l,c],i) => (
                  <div key={i} className="w-row" style={{ gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: c }} />
                    <span>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div className="w-card" style={{ padding: 12 }}>
            <h2 className="w-h2" style={{ marginBottom: 8 }}>최근 실적</h2>
            <div className="w-rule" style={{ marginBottom: 8 }} />
            <table style={{ width: '100%', fontSize: 11 }}>
              <thead><tr style={{ background: W.fill }}>
                <th style={{ padding: 4, textAlign: 'left' }}></th>
                <th style={{ padding: 4, textAlign: 'right' }}>실제</th>
                <th style={{ padding: 4, textAlign: 'right' }}>예상</th>
                <th style={{ padding: 4, textAlign: 'right' }}>서프라이즈</th>
              </tr></thead>
              <tbody>
                {[['매출','$35.1B','$33.1B','+6.0%'],['EPS','$0.81','$0.74','+9.5%'],['영업이익률','62.3%','58.0%','+4.3%p']].map((r,i) => (
                  <tr key={i}><td style={{ padding: 4 }}>{r[0]}</td><td className="w-mono" style={{ padding: 4, textAlign: 'right' }}>{r[1]}</td><td className="w-mono w-faint" style={{ padding: 4, textAlign: 'right' }}>{r[2]}</td><td className="w-mono w-up" style={{ padding: 4, textAlign: 'right' }}>{r[3]}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="w-card" style={{ padding: 12 }}>
            <h2 className="w-h2" style={{ marginBottom: 8 }}>밸류에이션 요약</h2>
            <div className="w-rule" style={{ marginBottom: 8 }} />
            <div className="w-col" style={{ gap: 6, fontSize: 11 }}>
              {[['DCF 적정가', '$152.40', '+2.8%', W.up],['평균 목표가', '$165.00', '+11.3%', W.up],['업계 PER 평균', '32배', 'NVDA 55배', W.down]].map(([l,v,d,c],i) => (
                <div key={i} className="w-row" style={{ justifyContent: 'space-between' }}>
                  <span className="w-faint">{l}</span>
                  <span><span className="w-mono">{v}</span> <span className="w-mono" style={{ color: c, fontSize: 10 }}>{d}</span></span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-card" style={{ padding: 12 }}>
            <h2 className="w-h2" style={{ marginBottom: 8 }}>고수 보유</h2>
            <div className="w-rule" style={{ marginBottom: 8 }} />
            <div className="w-col" style={{ gap: 4, fontSize: 11 }}>
              {[['Stanley Druckenmiller', '+12% Q3'],['Bill Ackman', '신규 매수'],['Cathie Wood', '−8% Q3'],['Buffett', '미보유']].map(([n,d],i) => (
                <div key={i} className="w-row" style={{ justifyContent: 'space-between' }}>
                  <span>{n}</span>
                  <span className="w-faint w-mono" style={{ fontSize: 10 }}>{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-card" style={{ padding: 12 }}>
          <h2 className="w-h2" style={{ marginBottom: 8 }}>회사 개요</h2>
          <div className="w-rule" style={{ marginBottom: 8 }} />
          <div className="w-faint" style={{ fontSize: 11, lineHeight: 1.6 }}>
            엔비디아는 GPU와 AI 가속기를 설계·공급하는 미국 반도체 기업이다. 데이터센터·게이밍·자율주행·전문 시각화 4개 사업부를 운영하며,
            데이터센터 부문 매출 비중이 87%로 AI 인프라 사이클의 최대 수혜 기업이다. 본사 캘리포니아 산타클라라, 직원 약 30,000명.
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab 2 — 차트 (트레이딩뷰 스타일 · 오버레이 + 서브패널 + 그리기 도구)
function WireStockChart() {
  return (
    <div className="w-root">
      <AppBar active="" />
      <STK_HEADER tabActive="차트" />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
        <div className="w-card-soft" style={{ padding: 8, fontSize: 11, color: W.muted }}>
          출처: KRX 일별 종가 (한국주) · Stooq 일별 (미국주) · 갱신 14:32 · <span className="w-up">정상</span> · 자체 SVG 차트 엔진 (TradingView 라이브러리 미사용)
        </div>

        <div className="w-row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {['1D','1W','1M','3M','6M','1Y','3Y','5Y','전체'].map((t,i) => (
            <span key={t} className="w-pill" style={{ background: i === 5 ? W.fill : W.bg }}>{t}</span>
          ))}
          <div className="w-vrule" />
          {['캔들','OHLC','선','영역','Heikin-Ashi'].map((t,i) => (
            <span key={t} className="w-pill" style={{ background: i === 0 ? W.fill : W.bg }}>{t}</span>
          ))}
          <div className="w-grow" />
          <span className="w-faint" style={{ fontSize: 10, alignSelf: 'center' }}>마우스 휠 줌 · 드래그 팬</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 240px', gap: 8 }}>
          {/* Drawing tools rail */}
          <div className="w-card" style={{ padding: 4 }}>
            <div className="w-col" style={{ gap: 4 }}>
              {[['↕','수평선'],['╱','추세선'],['▭','박스'],['◯','원'],['⌖','피보나치'],['#','패턴'],['✎','텍스트'],['📏','측정'],['🎯','앵커'],['↺','되돌리기'],['✕','지우기']].map(([g,t],i) => (
                <div key={i} title={t} style={{ width: 36, height: 32, border: `1px solid ${i === 1 ? W.line : W.hairline}`, background: i === 1 ? W.fill : W.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{g}</div>
              ))}
            </div>
          </div>

          {/* Main chart with overlays */}
          <div className="w-card" style={{ padding: 0, position: 'relative' }}>
            {/* Overlay legend */}
            <div style={{ position: 'absolute', top: 6, left: 8, fontSize: 10, zIndex: 2, background: 'rgba(255,255,255,0.85)', padding: '3px 6px' }}>
              <div className="w-mono" style={{ fontWeight: 600 }}>NVDA · 1Y · D</div>
              <div className="w-row" style={{ gap: 8, marginTop: 2, fontSize: 9 }}>
                <span><span style={{ display: 'inline-block', width: 8, height: 2, background: '#e0a64a', verticalAlign: 'middle' }} /> MA20 142.3</span>
                <span><span style={{ display: 'inline-block', width: 8, height: 2, background: W.accent, verticalAlign: 'middle' }} /> MA60 128.4</span>
                <span><span style={{ display: 'inline-block', width: 8, height: 2, background: '#7e4ec5', verticalAlign: 'middle' }} /> MA120 110.8</span>
                <span><span style={{ display: 'inline-block', width: 8, height: 2, background: '#888', verticalAlign: 'middle' }} /> BB(20,2)</span>
              </div>
            </div>
            {/* Crosshair tooltip mock */}
            <div style={{ position: 'absolute', top: 60, right: 80, fontSize: 10, zIndex: 2, background: W.ink, color: '#fff', padding: '6px 8px', borderRadius: 2 }}>
              <div className="w-mono" style={{ fontSize: 10, opacity: 0.7 }}>2025-12-15</div>
              <div className="w-mono" style={{ fontSize: 11, marginTop: 2 }}>O 145.20  H 149.40</div>
              <div className="w-mono" style={{ fontSize: 11 }}>L 144.80  C 148.20</div>
              <div className="w-mono" style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>V 198.4M</div>
            </div>
            {/* Vertical crosshair line */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '62%', width: 1, borderLeft: `1px dashed ${W.muted}`, zIndex: 1 }} />
            <CandleChart seed="full-chart" width={760} height={300} bars={120} />
            {/* Overlay lines drawn over candles */}
            <svg width="760" height="300" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
              {/* Bollinger upper/lower band shading */}
              <path d="M0,80 Q190,60 380,90 T760,70 L760,160 Q570,180 380,170 T0,170 Z" fill={W.muted} fillOpacity="0.06" />
              {/* MA20 — orange */}
              <path d="M0,140 Q150,130 300,135 T600,115 T760,105" stroke="#e0a64a" strokeWidth="1.4" fill="none" />
              {/* MA60 — accent blue */}
              <path d="M0,180 Q200,170 400,160 T760,140" stroke={W.accent} strokeWidth="1.4" fill="none" />
              {/* MA120 — purple */}
              <path d="M0,210 Q300,200 500,190 T760,175" stroke="#7e4ec5" strokeWidth="1.4" fill="none" />
              {/* Bollinger upper */}
              <path d="M0,80 Q190,60 380,90 T760,70" stroke={W.muted} strokeWidth="0.8" strokeDasharray="3,2" fill="none" />
              {/* Bollinger lower */}
              <path d="M0,170 Q190,180 380,170 T760,160" stroke={W.muted} strokeWidth="0.8" strokeDasharray="3,2" fill="none" />
              {/* User-drawn trendline */}
              <line x1="120" y1="240" x2="640" y2="100" stroke={W.down} strokeWidth="1.5" strokeDasharray="5,3" />
              <circle cx="120" cy="240" r="3" fill={W.down} />
              <circle cx="640" cy="100" r="3" fill={W.down} />
            </svg>
            {/* Right Y axis price labels */}
            <div style={{ position: 'absolute', top: 0, right: 4, height: 300, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: 9, padding: '4px 0', pointerEvents: 'none' }}>
              {['$155','$140','$125','$110','$95'].map(p => <span key={p} className="w-mono w-faint">{p}</span>)}
            </div>
          </div>

          {/* Indicators rail */}
          <div className="w-card" style={{ padding: 8 }}>
            <div className="w-h3" style={{ fontSize: 9 }}>가격 오버레이</div>
            <div className="w-rule" style={{ margin: '6px 0' }} />
            <div className="w-col" style={{ gap: 4, fontSize: 11 }}>
              {[['MA 5', false, '#3b82f6'],['MA 20', true, '#e0a64a'],['MA 60', true, W.accent],['MA 120', true, '#7e4ec5'],['EMA 12', false, '#22c55e'],['EMA 26', false, '#ef4444'],['볼린저 (20,2)', true, '#888'],['일목균형표', false, '#999'],['VWAP', false, '#a855f7']].map(([l,on,c],i) => (
                <div key={i} className="w-row" style={{ gap: 6 }}>
                  <span className="w-checkbox" style={{ background: on ? W.ink : W.bg }} />
                  <span style={{ display: 'inline-block', width: 10, height: 2, background: c }} />
                  <span style={{ color: on ? W.ink : W.muted, flex: 1 }}>{l}</span>
                  {on && <span className="w-faint" style={{ fontSize: 9 }}>⚙</span>}
                </div>
              ))}
            </div>
            <div className="w-rule" style={{ margin: '8px 0' }} />
            <div className="w-h3" style={{ fontSize: 9 }}>서브패널</div>
            <div className="w-rule" style={{ margin: '6px 0' }} />
            <div className="w-col" style={{ gap: 4, fontSize: 11 }}>
              {[['거래량', true],['RSI (14)', true],['MACD (12,26,9)', true],['Stochastic', false],['ATR (14)', false],['OBV', false],['CCI', false]].map(([l,on],i) => (
                <div key={i} className="w-row" style={{ gap: 6 }}>
                  <span className="w-checkbox" style={{ background: on ? W.ink : W.bg }} />
                  <span style={{ color: on ? W.ink : W.muted, flex: 1 }}>{l}</span>
                  {on && <span className="w-faint" style={{ fontSize: 9 }}>⚙</span>}
                </div>
              ))}
            </div>
            <button className="w-btn" style={{ marginTop: 10, width: '100%', fontSize: 10 }}>+ 지표 추가 (40+)</button>
          </div>
        </div>

        {/* Sub panels — 같은 X축 정렬 */}
        <div className="w-card" style={{ padding: 8 }}>
          <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 600 }}>거래량</span>
            <span className="w-mono w-faint" style={{ fontSize: 10 }}>198.4M (1.2x avg)</span>
          </div>
          <BarChart seed="vol-sub" width={1080} height={60} bars={120} />
        </div>
        <div className="w-card" style={{ padding: 8, position: 'relative' }}>
          <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 600 }}>RSI (14)</span>
            <span className="w-mono" style={{ fontSize: 10, color: W.down }}>78.4 · 과매수</span>
          </div>
          <AreaChart seed="rsi-full" width={1080} height={60} color={W.accent} fill={false} />
          {/* 30/70 gridlines overlay */}
          <div style={{ position: 'absolute', left: 8, right: 8, top: 28, height: 60, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: '30%', left: 0, right: 0, borderTop: `1px dashed ${W.down}`, opacity: 0.4 }} />
            <div style={{ position: 'absolute', top: '70%', left: 0, right: 0, borderTop: `1px dashed ${W.up}`, opacity: 0.4 }} />
          </div>
        </div>
        <div className="w-card" style={{ padding: 8 }}>
          <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 600 }}>MACD (12,26,9)</span>
            <span className="w-mono" style={{ fontSize: 10, color: W.up }}>MACD 2.4 · Signal 1.8 · Hist +0.6</span>
          </div>
          <AreaChart seed="macd-full" width={1080} height={60} color={W.up} fill={false} />
        </div>

        <div className="w-card-soft" style={{ padding: 10, fontSize: 11, color: W.muted }}>
          💡 구현 메모: 자체 SVG 엔진 (Lightweight Charts·TradingView 무료판은 워터마크 있음). MA·EMA·볼린저 등 계산은 Supabase Edge Function 또는 클라이언트에서 직접 (일별 OHLC 데이터로 충분히 빠름). 그리기 도구는 SVG 레이어를 차트 위에 얹어 마우스 이벤트로 추가/이동/삭제 — localStorage 저장.
        </div>
      </div>
    </div>
  );
}

// Tab 3 — 재무 (분석/재무분석과 유사하지만 종목 단일)
function WireStockFinancials() {
  return (
    <div className="w-root">
      <AppBar active="" />
      <STK_HEADER tabActive="재무" />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        <div className="w-row" style={{ gap: 6 }}>
          {['손익계산서','재무상태표','현금흐름표'].map((t,i) => (
            <span key={t} className="w-pill" style={{ background: i === 0 ? W.fill : W.bg }}>{t}</span>
          ))}
          <div className="w-vrule" />
          {['연간','분기'].map((t,i) => (
            <span key={t} className="w-pill" style={{ background: i === 0 ? W.fill : W.bg }}>{t}</span>
          ))}
          <div className="w-grow" />
          <span className="w-faint" style={{ fontSize: 10, alignSelf: 'center' }}>출처 EDGAR · 10-K · 갱신 11/14</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
          <div className="w-card" style={{ padding: 12 }}>
            <h2 className="w-h2" style={{ marginBottom: 8 }}>매출 / 영업이익 / 순이익 — 5년</h2>
            <div className="w-rule" style={{ marginBottom: 8 }} />
            <AreaChart seed="stk-fin-trend" width={680} height={220} color={W.ink} />
          </div>
          <div className="w-card" style={{ padding: 12 }}>
            <h2 className="w-h2" style={{ marginBottom: 8 }}>주요 비율 추이</h2>
            <div className="w-rule" style={{ marginBottom: 8 }} />
            <table style={{ width: '100%', fontSize: 11 }}>
              <thead><tr style={{ background: W.fill }}>
                <th style={{ padding: 4, textAlign: 'left' }}>지표</th>
                {['FY21','FY22','FY23','FY24','FY25'].map(y => <th key={y} style={{ padding: 4, textAlign: 'right' }}>{y}</th>)}
              </tr></thead>
              <tbody>
                {[['매출총이익률',64.9,64.9,56.9,72.7,75.0],['영업이익률',27.2,37.3,15.7,54.1,58.4],['순이익률',25.9,36.2,16.2,48.9,51.7],['ROE',25.4,44.9,17.9,99.3,91.5],['ROA',14.7,21.0,10.6,55.7,58.4],['부채비율',48,52,42,28,22]].map((r,i) => (
                  <tr key={i}>
                    <td style={{ padding: 4 }}>{r[0]}</td>
                    {r.slice(1).map((v,j) => <td key={j} className="w-mono" style={{ padding: 4, textAlign: 'right' }}>{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="w-card" style={{ padding: 12 }}>
          <h2 className="w-h2" style={{ marginBottom: 8 }}>손익계산서 ($B)</h2>
          <div className="w-rule" style={{ marginBottom: 8 }} />
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: W.fill }}>
              <th style={{ padding: 6, textAlign: 'left' }}>항목</th>
              {['FY21','FY22','FY23','FY24','FY25','5Y CAGR','업계 평균'].map(y => <th key={y} style={{ padding: 6, textAlign: 'right' }}>{y}</th>)}
            </tr></thead>
            <tbody>
              {[
                ['매출', 16.7, 26.9, 27.0, 60.9, 113.3, '+47%', '$28B'],
                ['매출원가', 5.9, 9.4, 11.6, 16.6, 28.3, '', ''],
                ['매출총이익', 10.8, 17.5, 15.4, 44.3, 85.0, '+51%', ''],
                ['판관비', 2.7, 5.5, 11.1, 11.3, 17.7, '', ''],
                ['영업이익', 4.5, 10.0, 4.2, 32.9, 66.0, '+71%', '$5B'],
                ['세전이익', 4.5, 9.9, 4.0, 33.2, 67.0, '', ''],
                ['법인세', 0.1, 0.2, -0.2, 4.1, 7.4, '', ''],
                ['순이익', 4.3, 9.8, 4.4, 29.8, 58.6, '+69%', '$3B'],
                ['EPS (희석)', 0.17, 0.39, 0.17, 1.19, 2.34, '', ''],
              ].map((r,i) => (
                <tr key={i} style={{ fontWeight: ['매출','영업이익','순이익'].includes(r[0]) ? 600 : 400 }}>
                  <td style={{ padding: 6, borderBottom: `1px solid ${W.hairline}` }}>{r[0]}</td>
                  {r.slice(1).map((v,j) => <td key={j} className="w-mono" style={{ padding: 6, textAlign: 'right', borderBottom: `1px solid ${W.hairline}` }}>{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Tab 4 — 밸류 (PER/PBR 추이 + 동종업계 비교 + DCF 요약)
function WireStockValue() {
  return (
    <div className="w-root">
      <AppBar active="" />
      <STK_HEADER tabActive="적정가치" />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {[
            ['PER','55.4','업계 32 · 5Y 평균 48',W.down],
            ['PBR','42.1','업계 8.4',W.down],
            ['EV/EBITDA','51.2','업계 24',W.down],
            ['배당수익률','0.03%','업계 1.8%',W.muted],
          ].map(([l,v,d,c],i) => (
            <div key={i} className="w-card" style={{ padding: 12 }}>
              <div className="w-h3">{l}</div>
              <div className="w-num-md" style={{ marginTop: 4 }}>{v}</div>
              <div style={{ color: c, fontSize: 10, marginTop: 4 }}>{d}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
          <div className="w-card" style={{ padding: 12 }}>
            <h2 className="w-h2" style={{ marginBottom: 8 }}>PER · PBR 5년 추이</h2>
            <div className="w-rule" style={{ marginBottom: 8 }} />
            <AreaChart seed="per-pbr" width={680} height={180} color={W.accent} />
            <div className="w-faint" style={{ fontSize: 10, marginTop: 4 }}>현재 PER 55배 · 5년 평균 48배 · 평균 대비 +14%</div>
          </div>
          <div className="w-card" style={{ padding: 12 }}>
            <h2 className="w-h2" style={{ marginBottom: 8 }}>적정주가 추정</h2>
            <div className="w-rule" style={{ marginBottom: 8 }} />
            <div className="w-col" style={{ gap: 8, fontSize: 11 }}>
              {[['DCF (5Y FCF 할인)', '$152.40', '+2.8%', W.up],['PER 멀티플 (52배 적용)', '$162.80', '+9.9%', W.up],['EV/EBITDA (업계 평균)', '$78.40', '−47.1%', W.down],['평균 (가중)', '$148.30', '+0.1%', W.muted]].map(([l,v,d,c],i) => (
                <div key={i} className="w-row" style={{ justifyContent: 'space-between', padding: '4px 0', borderBottom: i < 3 ? `1px solid ${W.hairline}` : 'none' }}>
                  <span className="w-faint">{l}</span>
                  <span><span className="w-mono">{v}</span> <span className="w-mono" style={{ color: c, fontSize: 10, marginLeft: 6 }}>{d}</span></span>
                </div>
              ))}
            </div>
            <button className="w-btn" style={{ marginTop: 10, width: '100%' }}>DCF 가정 직접 조정 →</button>
          </div>
        </div>

        <div className="w-card" style={{ padding: 12 }}>
          <h2 className="w-h2" style={{ marginBottom: 8 }}>동종업계 비교 (반도체)</h2>
          <div className="w-rule" style={{ marginBottom: 8 }} />
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: W.fill }}>
              <th style={{ padding: 6, textAlign: 'left' }}>종목</th>
              <th style={{ padding: 6, textAlign: 'right' }}>시총</th>
              <th style={{ padding: 6, textAlign: 'right' }}>PER</th>
              <th style={{ padding: 6, textAlign: 'right' }}>PBR</th>
              <th style={{ padding: 6, textAlign: 'right' }}>ROE</th>
              <th style={{ padding: 6, textAlign: 'right' }}>매출성장</th>
              <th style={{ padding: 6, textAlign: 'right' }}>영업이익률</th>
            </tr></thead>
            <tbody>
              {[
                ['NVDA · NVIDIA', '$3.65T', 55.4, 42.1, 91.5, '+126%', '54.1%', true],
                ['AMD · Advanced Micro', '$214B', 168.0, 4.2, 2.4, '+18%', '6.8%', false],
                ['TSM · Taiwan Semi', '$840B', 28.4, 6.8, 27.0, '+34%', '42.0%', false],
                ['AVGO · Broadcom', '$780B', 162.0, 12.4, 7.8, '+44%', '46.8%', false],
                ['INTC · Intel', '$92B', '−', 0.9, '−12%', '−4%', '−18%', false],
                ['업계 중간값', '—', 32.0, 5.4, 14.2, '+24%', '22.4%', null],
              ].map((r,i) => (
                <tr key={i} style={{ background: r[7] ? W.fill : 'transparent', fontWeight: r[7] ? 600 : (r[7] === null ? 600 : 400) }}>
                  <td style={{ padding: 6, borderBottom: `1px solid ${W.hairline}` }}>{r[0]}</td>
                  {r.slice(1, 7).map((v,j) => <td key={j} className="w-mono" style={{ padding: 6, textAlign: 'right', borderBottom: `1px solid ${W.hairline}` }}>{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

window.WireStockOverview = WireStockOverview;
window.WireStockChart = WireStockChart;
window.WireStockFinancials = WireStockFinancials;
window.WireStockValue = WireStockValue;
