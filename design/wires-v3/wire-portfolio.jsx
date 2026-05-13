// Portfolio v2.3 — 4 tabs: 요약 / 보유 / 거래내역 / 성과
// 거래내역: 별도 화면 흡수 (입출금·매매 기록)
// 성과: 신설 — 1년 리포트, 월별 히트맵, 양도세 시뮬

function WirePortfolio() {
  const [tab, setTab] = React.useState('요약');
  const tabs = ['요약', '보유', '거래내역', '성과'];

  const holdings = [
    { tk: 'AAPL', nm: 'Apple', qty: 40, avg: '152.00', cur: '184.32', val: '$7,372', pl: '+21.3%', up: true, w: 18.4, ms: 'locked', memos: 2, trades: 3, reviews: 1, thesis: 'AI 디바이스 사이클 + 서비스 매출 확장' },
    { tk: 'NVDA', nm: 'NVIDIA', qty: 12, avg: '420.00', cur: '912.18', val: '$10,946', pl: '+117.2%', up: true, w: 27.3, ms: 'locked', memos: 5, trades: 2, reviews: 2, thesis: 'AI 인프라 수요 지속 · DC 매출 YoY+200%' },
    { tk: 'MSFT', nm: 'Microsoft', qty: 18, avg: '380.00', cur: '424.10', val: '$7,634', pl: '+11.6%', up: true, w: 19.1, ms: 'memo', memos: 1, trades: 1, reviews: 0, thesis: null },
    { tk: '005930', nm: '삼성전자', qty: 80, avg: '72,400', cur: '78,400', val: '₩6,272,000', pl: '+8.3%', up: true, w: 12.4, ms: 'none', memos: 0, trades: 1, reviews: 0, thesis: null },
    { tk: 'TSLA', nm: 'Tesla', qty: 22, avg: '245.00', cur: '218.40', val: '$4,805', pl: '−10.9%', up: false, w: 12.0, ms: 'locked', memos: 3, trades: 4, reviews: 1, thesis: 'FSD v13 + 에너지 부문 마진 개선' },
    { tk: '000660', nm: 'SK하이닉스', qty: 25, avg: '210,000', cur: '198,500', val: '₩4,962,500', pl: '−5.5%', up: false, w: 10.8, ms: 'none', memos: 0, trades: 1, reviews: 0, thesis: null },
  ];
  const [expanded, setExpanded] = React.useState(null);
  const [trExpanded, setTrExpanded] = React.useState(null);

  const transactions = [
    ['2026-05-02', '매수', 'NVDA', 5, '$895.20', '$4,476.00', 'USD', '리밸런싱'],
    ['2026-04-28', '매도', 'TSLA', 8, '$220.10', '$1,760.80', 'USD', '손절'],
    ['2026-04-15', '배당', 'AAPL', 40, '$0.24', '$9.60', 'USD', ''],
    ['2026-04-02', '매수', '005930', 30, '₩78,200', '₩2,346,000', 'KRW', '저평가'],
    ['2026-03-20', '입금', '—', '—', '—', '₩2,000,000', 'KRW', '월급'],
    ['2026-03-15', '매수', 'MSFT', 5, '$418.50', '$2,092.50', 'USD', ''],
    ['2026-02-15', '매수', 'NVDA', 5, '$810.00', '$4,050.00', 'USD', '추가매수'],
    ['2026-02-08', '매도', '000660', 10, '₩205,000', '₩2,050,000', 'KRW', '비중조절'],
  ];

  const Section = ({ title, children, hint, right }) => (
    <div className="w-card" style={{ padding: 12 }}>
      <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 className="w-h2">{title}</h2>
        {(hint || right) && (right || <span className="w-faint" style={{ fontSize: 10 }}>{hint}</span>)}
      </div>
      <div className="w-rule" style={{ marginBottom: 8 }} />
      {children}
    </div>
  );

  return (
    <div className="w-root">
      <AppBar active="portfolio" />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>

        {/* Header */}
        <div className="w-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="w-h1">운용 / 포트폴리오</h1>
            <div className="w-faint" style={{ fontSize: 11, marginTop: 2 }}>최종 갱신 14:32 · 자동동기화 켬</div>
          </div>
          <div className="w-row" style={{ gap: 6 }}>
            <button className="w-btn" onClick={() => openModal('trade', {})}>+ 거래 기록</button>
            <button className="w-btn-ghost w-btn" onClick={() => openModal('csv', { mode: 'import' })}>CSV 가져오기</button>
            <button className="w-btn-ghost w-btn" onClick={() => openModal('csv', { mode: 'export' })}>⋯</button>
          </div>
        </div>

        {/* KPI strip — 항상 노출 */}
        <div className="w-card" style={{ padding: 0 }}>
          <div className="w-row">
            {[
              ['총 평가금액', '₩ 48,210,400', '', null],
              ['투자원금', '₩ 42,890,000', '', null],
              ['평가손익', '+₩ 5,320,400', '+12.4%', true],
              ['오늘 손익', '+₩ 184,320', '+0.38%', true],
              ['실현손익 (YTD)', '+₩ 1,840,000', '', true],
              ['연환산 수익률', '+18.2%', 'CAGR', true],
            ].map((kv, i, arr) => (
              <div key={i} className="w-grow" style={{ padding: 12, borderRight: i < arr.length - 1 ? `1px solid ${W.hairline}` : 'none' }}>
                <div className="w-h3" style={{ fontSize: 9 }}>{kv[0]}</div>
                <div className="w-num-md" style={{ marginTop: 2 }}>{kv[1]}</div>
                {kv[2] && <div className={kv[3] ? 'w-up' : 'w-down'} style={{ fontSize: 11, marginTop: 1 }}>{kv[2]}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="w-row" style={{ gap: 0, borderBottom: `1px solid ${W.hairline}` }}>
          {tabs.map(t => (
            <div key={t} onClick={() => setTab(t)} style={{
              padding: '8px 16px', fontSize: 12.5, cursor: 'pointer',
              fontWeight: t === tab ? 600 : 400,
              color: t === tab ? W.ink : W.muted,
              borderBottom: t === tab ? `2px solid ${W.ink}` : '2px solid transparent',
              position: 'relative', top: 1,
            }}>{t}</div>
          ))}
        </div>

        {/* === 요약 탭 === */}
        {tab === '요약' && (
          <div className="w-col" style={{ gap: 12 }}>
            {/* Performance vs benchmark */}
            <Section title="성과 vs 벤치마크" right={
              <div className="w-row" style={{ gap: 4 }}>
                {['1W','1M','3M','YTD','1Y','3Y','ALL'].map((p,i) => (
                  <span key={p} className="w-pill" style={{ background: i===3?W.ink:W.bg, color: i===3?'#fff':W.muted, borderColor: i===3?W.ink:W.hairline }}>{p}</span>
                ))}
              </div>
            }>
              <div style={{ position:'relative' }}>
                <AreaChart seed="port-perf" width={1080} height={140} color={W.accent} />
                <div style={{ position:'absolute', top:0, left:0 }}>
                  <AreaChart seed="port-bench" width={1080} height={140} color={W.muted} fill={false} />
                </div>
              </div>
              <div className="w-row" style={{ gap: 16, marginTop: 8, fontSize: 11 }}>
                <span className="w-row" style={{ gap: 6 }}><span style={{ width:10, height:2, background:W.accent }} /> 내 포트폴리오 +12.4%</span>
                <span className="w-row" style={{ gap: 6 }}><span style={{ width:10, height:2, background:W.muted }} /> KOSPI +4.1%</span>
                <span className="w-row" style={{ gap: 6 }}><span style={{ width:10, height:2, background:W.muted }} /> S&P +8.2%</span>
                <div className="w-grow" />
                <span className="w-faint" style={{ fontSize: 10 }}>최대낙폭 −8.2% · 샤프 1.42 · 베타 1.06</span>
              </div>
            </Section>

            {/* Allocation row */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1.2fr', gap: 12 }}>
              <Section title="자산 배분">
                <div className="w-row" style={{ gap: 12 }}>
                  <svg width="120" height="120" viewBox="0 0 42 42">
                    {(() => {
                      const data = [['주식·미국', 50, W.ink], ['주식·한국', 28, W.muted], ['ETF', 14, W.faint], ['현금', 8, W.hairline]];
                      let off = 25;
                      return data.map(([l, v, c]) => {
                        const dash = `${v} ${100 - v}`;
                        const el = <circle key={l} r="15.9" cx="21" cy="21" fill="transparent" stroke={c} strokeWidth="6" strokeDasharray={dash} strokeDashoffset={off} />;
                        off = off - v;
                        return el;
                      });
                    })()}
                  </svg>
                  <div className="w-col" style={{ gap: 6, fontSize: 11 }}>
                    {[['주식·미국', '50%', W.ink], ['주식·한국', '28%', W.muted], ['ETF', '14%', W.faint], ['현금', '8%', W.hairline]].map(([l,v,c]) => (
                      <div key={l} className="w-row" style={{ gap: 8 }}>
                        <span style={{ width:10, height:10, background:c }} />
                        <span className="w-grow">{l}</span>
                        <span className="w-mono">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>

              <Section title="섹터 분산">
                <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gridAutoRows: 38, gap: 2 }}>
                  {[
                    ['IT', 38, 'span 3 / span 3'],
                    ['반도체', 24, 'span 2 / span 3'],
                    ['소비재', 12, 'span 1 / span 2'],
                    ['금융', 10, 'span 1 / span 2'],
                    ['헬스케어', 8, 'span 1 / span 1'],
                    ['에너지', 5, 'span 1 / span 1'],
                    ['현금', 3, 'span 1 / span 1'],
                  ].map(([l,v,grid]) => (
                    <div key={l} style={{ background: W.fill, border:`1px solid ${W.hairline}`, padding: 4, gridArea: grid, fontSize: 10 }}>
                      <div style={{ fontWeight: 600 }}>{l}</div>
                      <div className="w-faint">{v}%</div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="리스크 지표">
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8 }}>
                  {[
                    ['베타 (vs S&P)', '1.06', null],
                    ['샤프 비율', '1.42', true],
                    ['소르티노', '1.88', true],
                    ['최대낙폭', '−8.2%', false],
                    ['변동성 (연환산)', '18.4%', null],
                    ['VaR 95% (1D)', '−1.8%', null],
                  ].map(([l,v,up]) => (
                    <div key={l} className="w-card-soft" style={{ padding: '6px 8px' }}>
                      <div className="w-h3" style={{ fontSize: 9 }}>{l}</div>
                      <div className={'w-num-md ' + (up===null?'':(up?'w-up':'w-down'))} style={{ fontSize: 13, marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            {/* Rebalance + Dividend */}
            <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap: 12 }}>
              <Section title="리밸런싱 제안" right={<span className="w-pill" style={{ background: W.fill }}>목표 배분 기준</span>}>
                <div className="w-col" style={{ gap: 6 }}>
                  {[
                    { tk: 'NVDA', cur: 27.3, tgt: 20.0, action: '−$2,930', sell: true },
                    { tk: 'TSLA', cur: 12.0, tgt: 8.0, action: '−$1,600', sell: true },
                    { tk: '005930', cur: 12.4, tgt: 18.0, action: '+₩2,240,000', sell: false },
                    { tk: '현금', cur: 8.0, tgt: 6.0, action: '−$800', sell: true },
                  ].map((r, i) => (
                    <div key={i} className="w-row" style={{ gap: 12, alignItems:'center', fontSize: 12 }}>
                      <div className="w-mono" style={{ width: 80, fontWeight: 600 }}>{r.tk}</div>
                      <div className="w-grow" style={{ position: 'relative', height: 14, background: W.fill }}>
                        <div style={{ position:'absolute', left: 0, top: 0, bottom: 0, width: `${r.cur*2}%`, background: W.muted, opacity: 0.5 }} />
                        <div style={{ position:'absolute', left: `${r.tgt*2}%`, top:-2, bottom:-2, width: 2, background: W.accent }} />
                      </div>
                      <div className="w-mono" style={{ width: 90, textAlign:'right', fontSize: 11 }}>{r.cur}% → {r.tgt}%</div>
                      <div className={'w-mono ' + (r.sell?'w-down':'w-up')} style={{ width: 110, textAlign:'right', fontSize: 11 }}>{r.action}</div>
                      <button className="w-btn" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => openModal('trade', { ticker: r.tk, side: r.sell ? '매도' : '매수' })}>실행</button>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="배당 캘린더" right={<span className="w-pill">5월</span>}>
                <div className="w-col" style={{ gap: 6, fontSize: 11 }}>
                  {[
                    ['5/15', 'AAPL', '$0.24', '$9.60'],
                    ['5/22', 'MSFT', '$0.75', '$13.50'],
                    ['5/30', '005930', '₩361', '₩28,880'],
                    ['6/03', 'KO', '$0.485', '—'],
                  ].map((r, i) => (
                    <div key={i} className="w-row" style={{ gap: 10 }}>
                      <div className="w-mono w-faint" style={{ width: 36, fontSize: 10 }}>{r[0]}</div>
                      <div className="w-mono w-grow">{r[1]}</div>
                      <div className="w-mono w-faint" style={{ fontSize: 10 }}>{r[2]}/주</div>
                      <div className="w-mono w-up" style={{ width: 70, textAlign:'right' }}>{r[3]}</div>
                    </div>
                  ))}
                  <div className="w-rule" style={{ margin: '4px 0' }} />
                  <div className="w-row" style={{ justifyContent:'space-between' }}>
                    <span className="w-h3">YTD 누적 배당</span>
                    <span className="w-num-md w-up" style={{ fontSize: 13 }}>₩ 184,200</span>
                  </div>
                </div>
              </Section>
            </div>
          </div>
        )}

        {/* === 보유 탭 === */}
        {tab === '보유' && (
          <Section title={`보유 종목 · ${holdings.length}개`} right={
            <div className="w-row" style={{ gap: 6 }}>
              <span className="w-pill" style={{ background: W.fill }}>전체</span>
              <span className="w-pill">미국</span>
              <span className="w-pill">한국</span>
              <span className="w-pill">ETF</span>
            </div>
          }>
            <div style={{ display:'grid', gridTemplateColumns:'1.4fr 0.6fr 0.8fr 0.8fr 1fr 0.8fr 0.6fr 0.7fr 80px', fontSize: 10, color: W.muted, padding: '8px 0', borderBottom: `1px solid ${W.hairline}`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <div>종목</div><div style={{ textAlign:'right' }}>수량</div>
              <div style={{ textAlign:'right' }}>평단가</div><div style={{ textAlign:'right' }}>현재가</div>
              <div style={{ textAlign:'right' }}>평가금액</div><div style={{ textAlign:'right' }}>손익률</div>
              <div style={{ textAlign:'right' }}>비중</div><div style={{ textAlign:'center' }}>메모</div><div></div>
            </div>
            {holdings.map((h, i) => (
              <React.Fragment key={h.tk}>
              <div onClick={() => setExpanded(expanded === h.tk ? null : h.tk)} style={{ display:'grid', gridTemplateColumns:'1.4fr 0.6fr 0.8fr 0.8fr 1fr 0.8fr 0.6fr 0.7fr 80px', alignItems:'center', padding:'10px 0', borderBottom: `1px solid ${W.hairline}`, fontSize: 12, cursor:'pointer', background: expanded === h.tk ? W.fill : 'transparent' }}>
                <div className="w-row" style={{ gap: 8 }}>
                  <div style={{ width:24, height:24, border:`1px solid ${W.hairline}`, borderRadius: 4, fontSize: 10, display:'flex', alignItems:'center', justifyContent:'center' }}>{h.tk[0]}</div>
                  <div>
                    <div className="w-mono" style={{ fontWeight: 600 }}>{h.tk}</div>
                    <div className="w-faint" style={{ fontSize: 10 }}>{h.nm}</div>
                  </div>
                </div>
                <div className="w-mono" style={{ textAlign:'right' }}>{h.qty}</div>
                <div className="w-mono" style={{ textAlign:'right' }}>{h.avg}</div>
                <div className="w-mono" style={{ textAlign:'right' }}>{h.cur}</div>
                <div className="w-mono" style={{ textAlign:'right' }}>{h.val}</div>
                <div className={'w-mono ' + (h.up?'w-up':'w-down')} style={{ textAlign:'right' }}>{h.pl}</div>
                <div className="w-mono" style={{ textAlign:'right' }}>{h.w}%</div>
                <div className="w-mono" style={{ textAlign:'center', fontSize: 11, color: h.ms==='locked' ? W.up : h.ms==='memo' ? W.ink : W.muted }}>
                  {h.ms === 'locked' ? `🔒 ${h.memos}` : h.ms === 'memo' ? `✎ ${h.memos}` : '—'}
                </div>
                <div style={{ textAlign:'right' }}>
                  <Sparkline seed={'h'+h.tk} up={h.up} width={56} height={18} />
                </div>
              </div>
              {expanded === h.tk && (
                <div style={{ padding: '12px 16px', background: W.fill, borderBottom: `1px solid ${W.hairline}`, display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap: 16 }}>
                  <div>
                    <div className="w-h3" style={{ fontSize: 9, marginBottom: 4 }}>{h.ms==='locked' ? '🔒 Thesis (잠금)' : 'Thesis'}</div>
                    {h.thesis ? (
                      <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>{h.thesis}</div>
                    ) : (
                      <div className="w-card-soft" style={{ padding: 8, fontSize: 11, color: W.muted, borderStyle: 'dashed' }}>
                        💡 매수 시점 기준을 적어두면 나중에 복기할 때 도움이 됩니다 <button className="w-btn" style={{ fontSize: 10, marginLeft: 6, opacity: 0.7 }} onClick={() => openModal('thesis', { ticker: r.tk })}>Thesis 작성하기</button>
                      </div>
                    )}
                  </div>
                  <div><div className="w-h3" style={{ fontSize: 9 }}>메모</div><div className="w-mono" style={{ fontSize: 16, fontWeight: 700 }}>{h.memos}</div></div>
                  <div><div className="w-h3" style={{ fontSize: 9 }}>거래</div><div className="w-mono" style={{ fontSize: 16, fontWeight: 700 }}>{h.trades}</div></div>
                  <div><div className="w-h3" style={{ fontSize: 9 }}>복기</div><div className="w-mono" style={{ fontSize: 16, fontWeight: 700 }}>{h.reviews}</div></div>
                </div>
              )}
              </React.Fragment>
            ))}
          </Section>
        )}

        {/* === 거래내역 탭 === (별도 화면 흡수) */}
        {tab === '거래내역' && (
          <div className="w-col" style={{ gap: 12 }}>
            {/* Filter bar */}
            <div className="w-card" style={{ padding: 10 }}>
              <div className="w-row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="w-faint" style={{ fontSize: 10 }}>기간</span>
                <span className="w-pill">1W</span><span className="w-pill">1M</span>
                <span className="w-pill" style={{ background: W.fill }}>3M</span>
                <span className="w-pill">YTD</span><span className="w-pill">1Y</span><span className="w-pill">전체</span>
                <div className="w-vrule" style={{ height: 16 }} />
                <span className="w-faint" style={{ fontSize: 10 }}>유형</span>
                <span className="w-pill" style={{ background: W.fill }}>전체</span>
                <span className="w-pill">매수</span><span className="w-pill">매도</span>
                <span className="w-pill">배당</span><span className="w-pill">입출금</span>
                <div className="w-grow" />
                <button className="w-btn" style={{ fontSize: 10 }} onClick={() => openModal('trade', {})}>+ 거래 기록</button>
                <button className="w-btn-ghost w-btn" style={{ fontSize: 10 }} onClick={() => openModal('csv', { mode: 'export' })}>CSV ↓</button>
              </div>
            </div>

            {/* Mini KPIs */}
            <div className="w-row" style={{ gap: 12 }}>
              {[['이번 달 매매', '12건'], ['매수 합계', '₩ 8,420,000'], ['매도 합계', '₩ 4,180,000'], ['실현손익', '+₩ 240,000', true], ['총 수수료', '₩ 12,400']].map(([l,v,up], i) => (
                <div key={i} className="w-card w-grow" style={{ padding: '8px 10px' }}>
                  <div className="w-h3" style={{ fontSize: 9 }}>{l}</div>
                  <div className={'w-num-md ' + (up?'w-up':'')} style={{ fontSize: 13, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>

            <Section title="거래 내역">
              <div style={{ display:'grid', gridTemplateColumns:'0.9fr 0.7fr 1fr 0.6fr 0.9fr 1fr 0.5fr 1.2fr', fontSize: 10, color: W.muted, padding: '8px 0', borderBottom: `1px solid ${W.hairline}`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <div>일자</div><div>유형</div><div>종목</div>
                <div style={{ textAlign:'right' }}>수량</div>
                <div style={{ textAlign:'right' }}>단가</div>
                <div style={{ textAlign:'right' }}>금액</div>
                <div>통화</div><div>메모</div>
              </div>
              {transactions.map((r, i) => {
                const typeColor = r[1] === '매수' ? W.up : r[1] === '매도' ? W.down : r[1] === '배당' ? W.accent : W.muted;
                const isSell = r[1] === '매도' || r[7] === '손절';
                const open = trExpanded === i;
                return (
                  <React.Fragment key={i}>
                  <div onClick={() => isSell && setTrExpanded(open ? null : i)} style={{ display:'grid', gridTemplateColumns:'0.9fr 0.7fr 1fr 0.6fr 0.9fr 1fr 0.5fr 1.2fr', alignItems:'center', padding:'8px 0', borderBottom: `1px solid ${W.hairline}`, fontSize: 11.5, cursor: isSell ? 'pointer' : 'default', background: open ? W.fill : 'transparent' }}>
                    <div className="w-mono w-faint">{r[0]}</div>
                    <div><span className="w-pill" style={{ borderColor: typeColor, color: typeColor, fontSize: 10 }}>{r[1]}</span></div>
                    <div className="w-mono" style={{ fontWeight: 500 }}>{r[2]}</div>
                    <div className="w-mono" style={{ textAlign:'right' }}>{r[3]}</div>
                    <div className="w-mono" style={{ textAlign:'right' }}>{r[4]}</div>
                    <div className="w-mono" style={{ textAlign:'right' }}>{r[5]}</div>
                    <div className="w-faint" style={{ fontSize: 10 }}>{r[6]}</div>
                    <div className="w-row" style={{ gap: 4, justifyContent: 'space-between' }}>
                      <span className="w-faint" style={{ fontSize: 10 }}>{r[7]}</span>
                      {isSell && <span className="w-faint" style={{ fontSize: 10 }}>{open ? '▴ 복기' : '▾ 복기'}</span>}
                    </div>
                  </div>
                  {open && isSell && (
                    <div style={{ gridColumn: '1 / -1', padding: '12px 16px', background: W.fill, borderBottom: `1px solid ${W.hairline}` }}>
                      <div className="w-h3" style={{ fontSize: 9, marginBottom: 6 }}>매도 복기 — {r[2]} ({r[7] || '매도'})</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>결과가 예상과 일치했나?</div>
                          <div className="w-col" style={{ gap: 4, fontSize: 11 }}>
                            {['예상대로 — Thesis 청산 조건 도달', '부분적으로 — 일부 가정 빗나감', '예상 빗나감 — Thesis 무너짐'].map((opt, j) => (
                              <label key={j} className="w-row" style={{ gap: 6, cursor: 'pointer' }}>
                                <input type="radio" name={`rev-${i}`} defaultChecked={j===1} /><span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>무엇을 배웠나? (다중 선택)</div>
                          <div className="w-row" style={{ gap: 4, flexWrap: 'wrap' }}>
                            {['시점이 빨랐음', '사이즈 과대', '시나리오 누락', '감정적 매매', '외부 변수', '잘했다'].map(tag => (
                              <span key={tag} className="w-pill" style={{ fontSize: 10, cursor: 'pointer', background: tag==='감정적 매매' ? W.ink : W.bg, color: tag==='감정적 매매' ? '#fff' : W.muted, borderColor: tag==='감정적 매매' ? W.ink : W.hairline }}>{tag}</span>
                            ))}
                          </div>
                          <textarea placeholder="추가 메모 (선택)" style={{ width: '100%', marginTop: 8, padding: 6, fontSize: 11, background: W.bg, border: `1px solid ${W.line}`, minHeight: 50 }} />
                        </div>
                      </div>
                    </div>
                  )}
                  </React.Fragment>
                );
              })}
              <div className="w-row" style={{ justifyContent: 'center', padding: '12px 0', gap: 6 }}>
                <span className="w-pill" style={{ background: W.fill }}>1</span>
                <span className="w-pill">2</span><span className="w-pill">3</span>
                <span className="w-faint" style={{ fontSize: 10, alignSelf: 'center' }}>...</span>
                <span className="w-pill">12</span>
              </div>
            </Section>
          </div>
        )}

        {/* === 성과 탭 === (신설) */}
        {tab === '성과' && (
          <div className="w-col" style={{ gap: 12 }}>
            {/* Period selector */}
            <div className="w-row" style={{ gap: 6 }}>
              {['1M','3M','6M','YTD','1Y','3Y','ALL','사용자 지정'].map((p,i)=>(
                <span key={p} className="w-pill" style={{ background: i===4?W.ink:W.bg, color: i===4?'#fff':W.muted, borderColor: i===4?W.ink:W.hairline }}>{p}</span>
              ))}
            </div>

            {/* Yearly cards */}
            <Section title="연도별 성과" hint="포트폴리오 시작 이후 누적">
              <div className="w-row" style={{ gap: 8 }}>
                {[
                  ['2024', '+18.2%', true, '시작 ₩30M → ₩35.5M'],
                  ['2025', '+24.1%', true, '₩35.5M → ₩44.0M'],
                  ['2026', '+9.6%', true, '₩44.0M → ₩48.2M (YTD)'],
                ].map(([y, r, up, note]) => (
                  <div key={y} className="w-card-soft w-grow" style={{ padding: 12 }}>
                    <div className="w-h3" style={{ fontSize: 10 }}>{y}</div>
                    <div className={up?'w-num-lg w-up':'w-num-lg w-down'} style={{ fontSize: 22, marginTop: 4 }}>{r}</div>
                    <div className="w-faint" style={{ fontSize: 10, marginTop: 4 }}>{note}</div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Monthly heatmap */}
            <Section title="월별 수익률 히트맵" hint="진할수록 큰 수익/손실">
              <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(12, 1fr)', gap: 2, fontSize: 10 }}>
                <div></div>
                {['1','2','3','4','5','6','7','8','9','10','11','12'].map(m => <div key={m} style={{ textAlign:'center', color:W.muted }}>{m}월</div>)}
                {[
                  ['2024', [null,null,null,null,null,null,null,null,2.1,3.4,5.8,6.2]],
                  ['2025', [4.2,-1.8,3.1,5.4,2.2,-3.4,6.1,4.8,-2.1,5.5,3.2,-1.2]],
                  ['2026', [3.4,-1.2,4.8,2.1,1.2,null,null,null,null,null,null,null]],
                ].map(([y, row]) => (
                  <React.Fragment key={y}>
                    <div className="w-mono" style={{ alignSelf:'center', color:W.muted }}>{y}</div>
                    {row.map((v, i) => {
                      if (v === null) return <div key={i} style={{ height: 28, background: W.fill, border: `1px solid ${W.hairline}` }} />;
                      const intensity = Math.min(Math.abs(v) / 6, 1);
                      const bg = v > 0 ? `rgba(34,139,90,${0.15 + intensity*0.6})` : `rgba(196,55,55,${0.15 + intensity*0.6})`;
                      return (
                        <div key={i} style={{ height: 28, background: bg, border: `1px solid ${W.hairline}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }} className="w-mono">
                          {v > 0 ? '+' : ''}{v.toFixed(1)}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </Section>

            {/* Contribution + Trade stats */}
            <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap: 12 }}>
              <Section title="종목별 기여도 TOP 10" hint="누적 손익 기준">
                <div className="w-col" style={{ gap: 6, fontSize: 11.5 }}>
                  {[
                    ['NVDA','반도체','+₩6,240,000','+117%', true],
                    ['AAPL','IT','+₩1,580,000','+21%', true],
                    ['MSFT','IT','+₩820,000','+12%', true],
                    ['005930','반도체','+₩480,000','+8%', true],
                    ['TSLA','자동차','−₩640,000','−11%', false],
                    ['000660','반도체','−₩300,000','−6%', false],
                  ].map((r, i) => (
                    <div key={i} className="w-row" style={{ alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: i < 5 ? `1px solid ${W.hairline}` : 'none' }}>
                      <div className="w-mono" style={{ width: 60, fontWeight: 600 }}>{r[0]}</div>
                      <div className="w-faint" style={{ width: 60, fontSize: 10 }}>{r[1]}</div>
                      <div className="w-grow" style={{ position: 'relative', height: 8, background: W.fill }}>
                        <div style={{ position: 'absolute', left: r[4] ? '50%' : `${50 - Math.abs(parseInt(r[3]))*0.4}%`, top: 0, bottom: 0, width: `${Math.abs(parseInt(r[3]))*0.4}%`, background: r[4] ? W.up : W.down, opacity: 0.6 }} />
                        <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: W.muted }} />
                      </div>
                      <div className={'w-mono ' + (r[4]?'w-up':'w-down')} style={{ width: 110, textAlign: 'right' }}>{r[2]}</div>
                      <div className={'w-mono ' + (r[4]?'w-up':'w-down')} style={{ width: 50, textAlign: 'right', fontSize: 10 }}>{r[3]}</div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="매매 통계" hint="2026 YTD">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    ['총 매매 횟수', '48건'],
                    ['승률', '62.5%'],
                    ['평균 수익', '+8.2%'],
                    ['평균 손실', '−4.4%'],
                    ['손익비', '1.86'],
                    ['평균 보유기간', '47일'],
                    ['회전율', '1.3x'],
                    ['최장 보유', 'AAPL · 412일'],
                  ].map(([l, v]) => (
                    <div key={l} className="w-card-soft" style={{ padding: '6px 8px' }}>
                      <div className="w-h3" style={{ fontSize: 9 }}>{l}</div>
                      <div className="w-num-md" style={{ fontSize: 13, marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            {/* Tax simulator + Annual review */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
              <Section title="양도세 시뮬레이션 (2025년부터 금투세)" hint="추정치 · 참고용">
                <div className="w-col" style={{ gap: 8, fontSize: 11.5 }}>
                  {[
                    ['실현 양도차익 (한국주)', '+₩1,240,000'],
                    ['실현 양도차익 (미국주)', '+$2,840 (₩3,920,000)'],
                    ['기본공제 (5,000만원)', '−₩50,000,000'],
                    ['과세표준', '₩0', '공제 한도 내'],
                  ].map(([l, v, note], i) => (
                    <div key={i} className="w-row" style={{ justifyContent: 'space-between', padding: '4px 0', borderBottom: i < 3 ? `1px solid ${W.hairline}` : 'none' }}>
                      <span>{l}</span>
                      <div className="w-row" style={{ gap: 6 }}>
                        <span className="w-mono">{v}</span>
                        {note && <span className="w-faint" style={{ fontSize: 10 }}>· {note}</span>}
                      </div>
                    </div>
                  ))}
                  <div className="w-card-soft" style={{ padding: 8, marginTop: 4 }}>
                    <div className="w-h3" style={{ fontSize: 9 }}>예상 납부세액</div>
                    <div className="w-num-md w-up" style={{ fontSize: 16, marginTop: 2 }}>₩ 0</div>
                  </div>
                  <div className="w-faint" style={{ fontSize: 9, marginTop: 4 }}>※ 실제 신고는 세무 전문가와 상담 권장</div>
                </div>
              </Section>

              <Section title="올해 회고" hint="자동 분석">
                <div className="w-col" style={{ gap: 8, fontSize: 11 }}>
                  {[
                    ['🏆 최고의 트레이드', 'NVDA 매수 · 2025-08-15 · +117%'],
                    ['💀 최악의 트레이드', 'TSLA 추가매수 · 2026-02-08 · −11%'],
                    ['📈 연속 수익', '4월 (+5.4%, 5거래일)'],
                    ['📉 최대 낙폭', '6월 −3.4% (KOSPI −5%)'],
                    ['⚡ 매매 빈도', '월평균 4건 · 적정 수준'],
                    ['🎯 패턴 발견', '실적 발표 직후 매수 → 평균 +6.2%'],
                  ].map(([l, v], i) => (
                    <div key={i} className="w-col" style={{ gap: 2 }}>
                      <div style={{ fontSize: 10, color: W.muted }}>{l}</div>
                      <div>{v}</div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

window.WirePortfolio = WirePortfolio;
