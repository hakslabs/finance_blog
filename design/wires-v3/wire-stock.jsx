// Stock Detail v2.3 — 8 tabs + floating memo + similar-stocks right sidebar
// Tabs: 개요 / 차트 / 재무 / 밸류에이션 / 공시·실적 / 뉴스 / 수급 / 컨센서스
// 기술 신호 → 개요 안 카드로 흡수
// 고수 보유 → 컨센서스 탭 안에 합침
// 유사 종목 → 우측 고정 사이드바
// 내 메모 → 우상단 플로팅 패널 (슬라이드 인)

function WireStockDetail() {
  const [tab, setTab] = React.useState('개요');
  const [memoOpen, setMemoOpen] = React.useState(false);
  const [starOpen, setStarOpen] = React.useState(false);
  const [checklistOpen, setChecklistOpen] = React.useState(false);
  const [checks, setChecks] = React.useState({ model: true, reason: true, exit: false });
  const [thesisLocked, setThesisLocked] = React.useState(false);
  const allChecked = checks.model && checks.reason && checks.exit;
  const tabs = ['개요', '차트', '재무', '밸류에이션', '공시·실적', '뉴스', '수급', '컨센서스'];

  const Section = ({ title, children, hint }) => (
    <div className="w-card" style={{ padding: 12 }}>
      <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 className="w-h2">{title}</h2>
        {hint && <span className="w-faint" style={{ fontSize: 10 }}>{hint}</span>}
      </div>
      <div className="w-rule" style={{ marginBottom: 8 }} />
      {children}
    </div>
  );

  return (
    <div className="w-root">
      <AppBar active="analysis" />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto', position: 'relative' }}>

        <div className="w-faint" style={{ fontSize: 11 }}>리서치 / 종목 / NVDA</div>

        {/* Header */}
        <div className="w-row" style={{ gap: 16, alignItems: 'flex-start' }}>
          <div style={{ width: 48, height: 48, border: `1px solid ${W.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>N</div>
          <div className="w-grow">
            <div className="w-row" style={{ gap: 8, alignItems: 'baseline' }}>
              <div className="w-mono" style={{ fontSize: 22, fontWeight: 700 }}>NVDA</div>
              <div style={{ fontSize: 14 }}>NVIDIA Corporation</div>
              <span className="w-tag">NASDAQ</span>
              <span className="w-pill">반도체</span>
              <span className="w-pill">★ 관심</span>
            </div>
            <div className="w-row" style={{ gap: 12, alignItems: 'baseline', marginTop: 4 }}>
              <div className="w-num-lg">$912.18</div>
              <div className="w-mono w-up" style={{ fontSize: 14 }}>+$30.20 (+3.42%)</div>
              <div className="w-faint" style={{ fontSize: 11 }}>2026-05-06 14:32 ET · 15분 지연</div>
            </div>
          </div>
          <div className="w-row" style={{ gap: 6, position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <button className="w-btn" onClick={() => setStarOpen(!starOpen)}>★ 관심추가 ▾</button>
              {starOpen && (
                <div className="w-card" style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 10, padding: 0, minWidth: 200, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                  <div style={{ padding: '8px 12px', fontSize: 11, cursor: 'pointer', borderBottom: `1px solid ${W.hairline}` }} onClick={() => { setStarOpen(false); }}>
                    <div style={{ fontWeight: 600 }}>★ 관심만 추가</div>
                    <div className="w-faint" style={{ fontSize: 10 }}>가격·뉴스 추적만</div>
                  </div>
                  <div style={{ padding: '8px 12px', fontSize: 11, cursor: 'pointer' }} onClick={() => { setStarOpen(false); setMemoOpen(true); }}>
                    <div style={{ fontWeight: 600, color: W.accent }}>🔍 분석 중으로 표시</div>
                    <div className="w-faint" style={{ fontSize: 10 }}>상태 = 검토 · 메모 자동 오픈</div>
                  </div>
                </div>
              )}
            </div>
            <button className="w-btn" onClick={() => openModal('trade', { ticker: 'NVDA', side: '매수' })}>매수 기록</button>
            <button className="w-btn" onClick={() => openModal('alert', { ticker: 'NVDA' })}>🔔 알림</button>
            <button className="w-btn" onClick={() => setMemoOpen(!memoOpen)} style={{ background: memoOpen ? W.ink : 'transparent', color: memoOpen ? '#fff' : W.ink }}>📝 메모</button>
          </div>
        </div>

        {/* Key stats strip */}
        <div className="w-card" style={{ padding: 0 }}>
          <div className="w-row">
            {[
              ['시가총액', '$2.24T'], ['거래량', '48.2M'], ['52W 고/저', '$974 / $410'],
              ['PER', '68.4'], ['PBR', '52.1'], ['ROE', '91.2%'],
              ['배당수익률', '0.02%'], ['베타', '1.74'],
            ].map((kv, i, arr) => (
              <div key={kv[0]} className="w-grow" style={{ padding: '8px 12px', borderRight: i < arr.length - 1 ? `1px solid ${W.hairline}` : 'none' }}>
                <div className="w-h3" style={{ fontSize: 9 }}>{kv[0]}</div>
                <div className="w-num-md" style={{ fontSize: 13, marginTop: 2 }}>{kv[1]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Body: tabs (left) + similar stocks sidebar (right) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 12 }}>
          <div className="w-col" style={{ gap: 12, minWidth: 0 }}>
            {/* 8 Tabs */}
            <div className="w-row" style={{ gap: 0, borderBottom: `1px solid ${W.hairline}`, flexWrap: 'wrap' }}>
              {tabs.map(t => (
                <div key={t} onClick={() => setTab(t)} style={{
                  padding: '8px 14px', fontSize: 12, cursor: 'pointer',
                  fontWeight: t === tab ? 600 : 400,
                  color: t === tab ? W.ink : W.muted,
                  borderBottom: t === tab ? `2px solid ${W.ink}` : '2px solid transparent',
                  position: 'relative', top: 1,
                }}>{t}</div>
              ))}
            </div>

            {tab === '개요' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
                <Section title="가격 · 1년 추이" hint="일별 종가">
                  <AreaChart seed="NVDA-1Y" width={560} height={200} color={W.up} />
                  <div className="w-row" style={{ gap: 4, marginTop: 8 }}>
                    {['1D','1W','1M','3M','6M','1Y','5Y','ALL'].map((p,i)=>(
                      <span key={p} className="w-pill" style={{ background: i===5 ? W.ink : W.bg, color: i===5 ? '#fff' : W.muted, borderColor: i===5 ? W.ink : W.hairline }}>{p}</span>
                    ))}
                  </div>
                </Section>
                <Section title="기업 개요">
                  <div style={{ fontSize: 11.5, lineHeight: 1.6, color: W.muted }}>
                    NVIDIA는 GPU 및 AI 가속 컴퓨팅 플랫폼 설계 기업.
                    데이터센터·게이밍·자동차·전문가용 비주얼 4개 사업부.<br/><br/>
                    <b>본사</b> Santa Clara, CA · <b>설립</b> 1993<br/>
                    <b>CEO</b> Jensen Huang · <b>직원</b> 29,600명<br/>
                    <b>회계연도 마감</b> 1월 말
                  </div>
                </Section>
                <Section title="섹터 내 위치 (반도체)">
                  <div className="w-col" style={{ gap: 6, fontSize: 11 }}>
                    {[['시가총액 순위','1위 / 30개사'],['YTD 수익률','+42% (섹터 +18%)'],['PER (섹터 평균)','68.4 (28.2)'],['ROE (섹터 평균)','91.2% (22.4%)']].map(([l,v])=>(
                      <div key={l} className="w-row" style={{ justifyContent:'space-between' }}><span>{l}</span><span className="w-mono">{v}</span></div>
                    ))}
                  </div>
                </Section>
                {/* 기술 신호 흡수 */}
                <Section title="기술 신호" hint="자체 계산 · 참고용">
                  <div className="w-col" style={{ gap: 6, fontSize: 11 }}>
                    {[
                      ['골든크로스 (MA20/60)','확인됨 · 2주 전', W.up],
                      ['RSI(14)','64.2 · 중립', W.muted],
                      ['MACD','상승 다이버전스', W.up],
                      ['볼린저밴드','상단 근접', W.muted],
                      ['52주 신고가 대비','−6.4%', W.muted],
                      ['거래량 (20일 평균)','+34%', W.up],
                    ].map(([l,v,c])=>(
                      <div key={l} className="w-row" style={{ justifyContent:'space-between' }}><span>{l}</span><span style={{ color: c }} className="w-mono">{v}</span></div>
                    ))}
                  </div>
                </Section>
              </div>
            )}

            {tab === '차트' && (
              <Section title="풀 차트" hint="MA · RSI · MACD · 볼밴 · 거래량">
                <div className="w-row" style={{ gap: 8, marginBottom: 8, padding: '6px 10px', background: W.fill, fontSize: 10.5 }}>
                  <span className="w-mono" style={{ fontWeight: 600 }}>데이터:</span>
                  <span>한국주 KRX · 일별 종가 (전일 18:30 갱신) / 미국주 Finnhub · 15분 지연</span>
                </div>
                <div className="w-row" style={{ gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  {['1D','1W','1M','3M','6M','1Y','5Y'].map((p,i)=>(<span key={p} className="w-pill" style={{ background: i===2?W.ink:W.bg, color: i===2?'#fff':W.muted, borderColor: i===2?W.ink:W.hairline }}>{p}</span>))}
                  <div className="w-vrule" style={{ height: 18 }} />
                  <span className="w-pill" style={{ background: W.fill }}>캔들</span><span className="w-pill">라인</span>
                  <div className="w-vrule" style={{ height: 18 }} />
                  <span className="w-pill">+ 지표</span><span className="w-pill">MA(20)</span><span className="w-pill">MA(60)</span><span className="w-pill">볼린저</span><span className="w-pill">RSI</span><span className="w-pill">MACD</span>
                </div>
                <CandleChart seed="NVDA-full" width={960} height={300} bars={90} />
                <div style={{ height: 8 }} />
                <div className="w-faint" style={{ fontSize: 9, marginBottom: 4 }}>Volume</div>
                <svg width="960" height="50">
                  {Array.from({length:90}).map((_,i)=>{const h=8+((i*13)%30);const up=(i*7)%3!==0;return <rect key={i} x={i*(960/90)+1} y={50-h} width={(960/90)-2} height={h} fill={up?W.up:W.down} opacity="0.4"/>;})}
                </svg>
                <div style={{ height: 8 }} />
                <div className="w-faint" style={{ fontSize: 9, marginBottom: 4 }}>RSI(14) · 64.2</div>
                <Sparkline seed="rsi-NVDA" up={true} width={960} height={50} stroke={W.accent} />
              </Section>
            )}

            {tab === '재무' && (
              <div className="w-col" style={{ gap: 12 }}>
                <Section title="손익계산서 · 5년" hint="EDGAR / DART">
                  <div className="w-row" style={{ gap: 6, marginBottom: 8 }}>
                    <span className="w-pill" style={{ background: W.fill }}>연간</span>
                    <span className="w-pill">분기</span>
                    <span className="w-pill">TTM</span>
                    <div className="w-grow" />
                    <span className="w-pill">USD ▾</span>
                  </div>
                  <table style={{ width:'100%', fontSize: 11.5, borderCollapse:'collapse' }}>
                    <thead><tr style={{ background: W.fill }}>
                      <th style={{ padding:'6px 10px', textAlign:'left' }}>항목</th>
                      {['2021','2022','2023','2024','2025'].map(y=><th key={y} style={{ padding:'6px 10px', textAlign:'right' }}>{y}</th>)}
                    </tr></thead>
                    <tbody>
                      {[
                        ['매출액','16.7B','26.9B','27.0B','60.9B','130.5B'],
                        ['매출원가','6.3B','9.4B','11.6B','16.6B','32.7B'],
                        ['영업이익','4.5B','10.0B','4.2B','32.9B','86.1B'],
                        ['순이익','4.3B','9.8B','4.4B','29.7B','72.9B'],
                        ['EPS','1.73','3.85','1.74','11.93','29.42'],
                      ].map((r,i)=>(<tr key={i} style={{ borderBottom:`1px solid ${W.hairline}` }}>
                        <td style={{ padding:'6px 10px', fontWeight: 500 }}>{r[0]}</td>
                        {r.slice(1).map((v,j)=><td key={j} className="w-mono" style={{ padding:'6px 10px', textAlign:'right' }}>{v}</td>)}
                      </tr>))}
                    </tbody>
                  </table>
                </Section>
                <div style={{ display:'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Section title="재무상태표 · 요약"><div className="w-faint" style={{ fontSize: 11 }}>자산 · 부채 · 자본 5년 추이 — 같은 형식 표</div></Section>
                  <Section title="현금흐름표 · 요약"><div className="w-faint" style={{ fontSize: 11 }}>영업·투자·재무 활동 5년 추이</div></Section>
                </div>
              </div>
            )}

            {tab === '밸류에이션' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
                <Section title="배수 추이 · 5년">
                  <div className="w-faint" style={{ fontSize: 10, marginBottom: 6 }}>PER · PBR · EV/EBITDA</div>
                  <AreaChart seed="NVDA-PER" width={460} height={180} color={W.muted} fill={false} />
                </Section>
                <Section title="동종업계 비교">
                  <table style={{ width:'100%', fontSize: 11.5 }}>
                    <thead><tr><th style={{ textAlign:'left' }}>종목</th><th style={{ textAlign:'right' }}>PER</th><th style={{ textAlign:'right' }}>PBR</th><th style={{ textAlign:'right' }}>ROE</th></tr></thead>
                    <tbody>{[['NVDA','68.4','52.1','91.2%'],['AMD','42.1','4.8','12.4%'],['INTC','—','1.4','−4.2%'],['TSM','24.8','5.2','27.8%']].map((r,i)=>(<tr key={i} style={{ borderTop:`1px solid ${W.hairline}` }}>{r.map((v,j)=><td key={j} className="w-mono" style={{ padding:'5px 6px', textAlign: j===0?'left':'right', fontWeight: j===0?600:400 }}>{v}</td>)}</tr>))}</tbody>
                  </table>
                </Section>
                <Section title="간이 DCF 계산기">
                  <div className="w-faint" style={{ fontSize: 11 }}>FCF · 성장률 · 할인율 슬라이더로 적정주가 계산</div>
                </Section>
                <Section title="공정가치 추정 (히스토리 기반)">
                  <div className="w-faint" style={{ fontSize: 11 }}>5년 평균 PER 기준 공정가치 vs 현재가</div>
                </Section>
              </div>
            )}

            {tab === '공시·실적' && (
              <Section title="공시 타임라인 + 실적 발표" hint="DART / EDGAR">
                <div className="w-col" style={{ gap: 8, fontSize: 11.5 }}>
                  {[
                    ['2026-05-22','실적 발표 예정','컨센서스 EPS 6.42'],
                    ['2026-04-28','8-K · 신제품 발표',''],
                    ['2026-02-21','10-Q · Q4 실적','EPS 5.16 (예상 4.59) ✓'],
                    ['2026-01-15','Form 4 · 임원 매도',''],
                    ['2025-11-20','10-Q · Q3 실적','EPS 0.81 (예상 0.74) ✓'],
                  ].map(([d,t,s],i)=>(
                    <div key={i} className="w-row" style={{ borderBottom:`1px solid ${W.hairline}`, padding:'6px 0' }}>
                      <div className="w-mono w-faint" style={{ width: 100 }}>{d}</div>
                      <div className="w-grow">{t}</div>
                      <div className="w-faint" style={{ fontSize: 10 }}>{s}</div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {tab === '뉴스' && (
              <Section title="종목 뉴스" hint="RSS · NewsAPI">
                <div className="w-col" style={{ gap: 8 }}>
                  {[
                    ['12분 전','Bloomberg','엔비디아 신규 칩 발표, 시간외 +4%'],
                    ['1시간','Reuters','데이터센터 매출 가이던스 상향'],
                    ['3시간','WSJ','중국 수출 규제 영향 분석'],
                    ['어제','한경','SK하이닉스 HBM 협력 확대'],
                    ['2일 전','연합','Jensen Huang GTC 키노트'],
                  ].map(([t,s,h],i)=>(
                    <div key={i} className="w-row" style={{ gap: 10, borderBottom:`1px solid ${W.hairline}`, padding: '8px 0' }}>
                      <div className="w-mono w-faint" style={{ width: 70, fontSize: 10 }}>{t}</div>
                      <div className="w-grow"><div style={{ fontSize: 12 }}>{h}</div><div className="w-faint" style={{ fontSize: 10 }}>{s}</div></div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {tab === '수급' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
                <Section title="투자자별 매매동향 (한국주만)" hint="KRX OpenAPI">
                  <div className="w-faint" style={{ fontSize: 11, marginBottom: 6 }}>이 종목은 미국주 — 한국 수급 데이터 없음</div>
                  <div style={{ padding: 16, background: W.fill, fontSize: 11, color: W.muted, textAlign: 'center' }}>
                    미국 종목은 무료 공식 데이터에서 일별 외국인/기관 매매동향 미제공
                  </div>
                </Section>
                <Section title="공매도 잔고">
                  <div className="w-faint" style={{ fontSize: 11 }}>FINRA Short Volume · 일 1회</div>
                  <Sparkline seed="short-NVDA" up={false} width={460} height={80} stroke={W.down} />
                </Section>
                <Section title="13F 기관 보유 변화" hint="EDGAR">
                  <div className="w-col" style={{ gap: 6, fontSize: 11 }}>
                    {[['Vanguard','9.2%','+0.4%'],['BlackRock','7.8%','+0.2%'],['ARK Invest','0.8%','+2.1%'],['Berkshire','—','—']].map(([n,p,c],i)=>(
                      <div key={i} className="w-row" style={{ justifyContent:'space-between' }}><span>{n}</span><span className="w-mono">{p}</span><span className="w-faint">{c}</span></div>
                    ))}
                  </div>
                </Section>
                <Section title="내부자 거래" hint="Form 4">
                  <div className="w-col" style={{ gap: 6, fontSize: 11 }}>
                    {[['Jensen Huang','매도','120K @ $895'],['CFO','매도','24K @ $880']].map((r,i)=>(<div key={i} className="w-row" style={{ justifyContent:'space-between' }}>{r.map((v,j)=><span key={j} className={j===0?'':'w-mono'}>{v}</span>)}</div>))}
                  </div>
                </Section>
              </div>
            )}

            {tab === '컨센서스' && (
              <div className="w-col" style={{ gap: 12 }}>
                <Section title="애널리스트 컨센서스 (미국주만)" hint="Finnhub Free">
                  <div className="w-row" style={{ gap: 16, marginBottom: 12 }}>
                    <div><div className="w-num-lg w-up">강력매수</div><div className="w-faint" style={{ fontSize: 10 }}>42명 평균</div></div>
                    <div className="w-vrule" />
                    <div><div className="w-h3">목표주가 평균</div><div className="w-num-md">$1,080</div></div>
                    <div className="w-vrule" />
                    <div><div className="w-h3">상승여력</div><div className="w-num-md w-up">+18.4%</div></div>
                  </div>
                  <AreaChart seed="NVDA-target" width={620} height={120} color={W.accent} />
                  <div className="w-faint" style={{ fontSize: 10, marginTop: 6 }}>목표주가 추이 · 12개월</div>
                  <div className="w-faint" style={{ fontSize: 10, marginTop: 12 }}>※ 한국주는 무료 컨센서스 미제공</div>
                </Section>
                {/* 고수 보유 흡수 */}
                <Section title="이 종목을 보유한 고수" hint="13F · 분기">
                  <div className="w-col" style={{ gap: 6, fontSize: 11.5 }}>
                    {[
                      ['Cathie Wood (ARK)','8.2%','+2.1%','신규 매수'],
                      ['Stanley Druckenmiller','4.4%','신규',''],
                      ['Bill Ackman','—','청산','전량 매도'],
                      ['David Tepper','3.1%','+0.5%',''],
                    ].map(([n,p,c,note],i)=>(<div key={i} className="w-row" style={{ padding:'6px 0', borderBottom:`1px solid ${W.hairline}`, gap: 10 }}>
                      <div style={{ width: 24, height: 24, border:`1px solid ${W.hairline}`, borderRadius:'50%' }} />
                      <div className="w-grow">{n}</div>
                      <div className="w-mono">{p}</div>
                      <div className="w-faint" style={{ width: 90, textAlign:'right' }}>{c}</div>
                      <div className="w-faint" style={{ width: 80, textAlign:'right' }}>{note}</div>
                    </div>))}
                  </div>
                </Section>
              </div>
            )}
          </div>

          {/* Right sidebar: similar stocks (always visible) */}
          <div className="w-col" style={{ gap: 12 }}>
            <div className="w-card" style={{ padding: 12 }}>
              <div className="w-h2" style={{ marginBottom: 6 }}>유사 종목</div>
              <div className="w-faint" style={{ fontSize: 10, marginBottom: 8 }}>섹터 · 시총 · 상관계수</div>
              <div className="w-rule" style={{ marginBottom: 8 }} />
              <div className="w-col" style={{ gap: 8, fontSize: 11 }}>
                {[['AMD','반도체','0.78','+1.2%', W.up],['TSM','반도체','0.72','+0.4%', W.up],['AVGO','반도체','0.68','−0.8%', W.down],['INTC','반도체','0.42','−2.1%', W.down],['QCOM','반도체','0.55','+0.6%', W.up]].map((r,i)=>(
                  <div key={i} className="w-row" style={{ justifyContent: 'space-between', padding: '4px 0', borderBottom: i < 4 ? `1px solid ${W.hairline}` : 'none' }}>
                    <div className="w-col" style={{ gap: 1 }}>
                      <span className="w-mono" style={{ fontWeight: 600 }}>{r[0]}</span>
                      <span className="w-faint" style={{ fontSize: 9 }}>상관 {r[2]}</span>
                    </div>
                    <span className="w-mono" style={{ color: r[4], fontSize: 11 }}>{r[3]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-card" style={{ padding: 12 }}>
              <div className="w-h2" style={{ marginBottom: 6 }}>섹터 평균 대비</div>
              <div className="w-rule" style={{ marginBottom: 8 }} />
              <div className="w-col" style={{ gap: 6, fontSize: 11 }}>
                {[['PER','68.4','28.2'],['PBR','52.1','4.6'],['ROE','91.2%','22.4%'],['배당률','0.02%','1.4%']].map(([l,v,avg])=>(
                  <div key={l} className="w-col" style={{ gap: 2 }}>
                    <div className="w-row" style={{ justifyContent:'space-between' }}><span>{l}</span><span className="w-mono">{v}</span></div>
                    <div className="w-faint" style={{ fontSize: 9, textAlign: 'right' }}>섹터 평균 {avg}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-card" style={{ padding: 12 }}>
              <div className="w-h2" style={{ marginBottom: 6 }}>관련 ETF</div>
              <div className="w-rule" style={{ marginBottom: 8 }} />
              <div className="w-col" style={{ gap: 4, fontSize: 11 }}>
                {[['SOXX','iShares 반도체'],['SMH','VanEck 반도체'],['SOXL','3x 레버리지']].map(([t,n])=>(
                  <div key={t} className="w-row" style={{ justifyContent:'space-between' }}><span className="w-mono">{t}</span><span className="w-faint" style={{ fontSize: 10 }}>{n}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Floating memo panel — slides in from right */}
        {memoOpen && (
          <div style={{
            position: 'absolute', top: 60, right: 16, width: 360, maxHeight: 'calc(100% - 80px)',
            background: W.bg, border: `1px solid ${W.line}`, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            display: 'flex', flexDirection: 'column', zIndex: 10,
          }}>
            <div className="w-row" style={{ justifyContent: 'space-between', padding: '10px 12px', borderBottom: `1px solid ${W.hairline}`, background: W.fill }}>
              <div className="w-h2">📝 NVDA 메모</div>
              <div className="w-row" style={{ gap: 6 }}>
                <span className="w-pill" style={{ fontSize: 9 }}>저장됨</span>
                <span onClick={() => setMemoOpen(false)} style={{ cursor: 'pointer', color: W.muted, fontSize: 14 }}>✕</span>
              </div>
            </div>
            <div style={{ padding: 12, overflow: 'auto' }}>
              {/* 분석 체크리스트 + Thesis 잠금 */}
              <div className="w-card-soft" style={{ padding: 0, marginBottom: 10, borderColor: thesisLocked ? W.up : W.line }}>
                <div className="w-row" style={{ justifyContent: 'space-between', padding: '6px 10px', cursor: 'pointer', background: thesisLocked ? 'rgba(46,139,87,0.06)' : 'transparent' }} onClick={() => setChecklistOpen(!checklistOpen)}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{thesisLocked ? '🔒 Thesis 잠금됨' : '분석 체크리스트'}</span>
                  <span className="w-faint" style={{ fontSize: 10 }}>
                    {thesisLocked ? '읽기 모드 · 사후 편집 불가' : `${Object.values(checks).filter(Boolean).length}/3 완료 ${checklistOpen ? '▴' : '▾'}`}
                  </span>
                </div>
                {checklistOpen && !thesisLocked && (
                  <div style={{ padding: '8px 10px', borderTop: `1px solid ${W.hairline}` }}>
                    {[
                      ['model', '수익모델 이해'],
                      ['reason', '매수근거 명확'],
                      ['exit', '청산기준 설정'],
                    ].map(([k, l]) => (
                      <label key={k} className="w-row" style={{ gap: 6, padding: '3px 0', fontSize: 11, cursor: 'pointer' }}>
                        <input type="checkbox" checked={checks[k]} onChange={e => setChecks({ ...checks, [k]: e.target.checked })} />
                        <span>{l}</span>
                      </label>
                    ))}
                    <button
                      className={allChecked ? 'w-btn-primary w-btn' : 'w-btn'}
                      disabled={!allChecked}
                      onClick={() => setThesisLocked(true)}
                      style={{ marginTop: 6, fontSize: 10.5, opacity: allChecked ? 1 : 0.4 }}
                    >🔒 Thesis로 잠금</button>
                    <div className="w-faint" style={{ fontSize: 10, marginTop: 4 }}>잠근 뒤에는 알람 트리거 시 반응 메모만 추가됩니다.</div>
                  </div>
                )}
              </div>

              <div className="w-faint" style={{ fontSize: 10, marginBottom: 8 }}>Markdown 지원 · 자동 저장 · 매매 기록과 연결</div>
              <div style={{ minHeight: 220, padding: 10, background: W.fill, fontSize: 11.5, color: W.muted, fontFamily: 'monospace', lineHeight: 1.6 }}>
                # NVDA 분석<br/><br/>
                ## 매수 이유<br/>
                - AI 인프라 수요 지속<br/>
                - 데이터센터 매출 YoY +200%<br/><br/>
                ## 체크리스트<br/>
                - [ ] Q2 실적 확인 (5/22)<br/>
                - [ ] 중국 규제 영향 모니터링<br/>
                - [x] 13F 분기 변화 점검
              </div>
              <div className="w-rule" style={{ margin: '12px 0' }} />
              <div className="w-h3" style={{ marginBottom: 6 }}>매매 일지</div>
              <div className="w-col" style={{ gap: 4, fontSize: 10.5 }}>
                <div className="w-row" style={{ justifyContent: 'space-between' }}><span>2025-12-04 매수</span><span className="w-mono">10주 @ $740</span></div>
                <div className="w-row" style={{ justifyContent: 'space-between' }}><span>2026-02-15 추가매수</span><span className="w-mono">5주 @ $810</span></div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

window.WireStockDetail = WireStockDetail;
