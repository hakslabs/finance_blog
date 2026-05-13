// Analysis Hub v2.3 — tabs include 시장 심리 (full 9-gauge page)
// Tabs: 개관 / 시장 심리 / 기술적 / 재무제표 / 퀀트 팩터 / DCF 밸류에이션 / 섹터 로테이션 / 신호 알림

function WireAnalysis() {
  const [tab, setTab] = React.useState('시장 한눈에');
  const tabs = ['시장 한눈에','시장 심리','기술적 분석','재무 분석','퀀트 팩터','적정주가 계산','섹터 흐름','신호 알림'];

  return (
    <div className="w-root">
      <AppBar active="analysis" />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>

        <div>
          <h1 className="w-h1">분석</h1>
          <div className="w-faint" style={{ fontSize: 11, marginTop: 2 }}>
            시장 한눈에 · 심리 · 기술적 · 재무 · 퀀트 팩터 · 적정주가 — 모든 분석 도구의 진입점
          </div>
        </div>

        {/* Tab strip */}
        <div className="w-row" style={{ borderBottom: `1px solid ${W.hairline}`, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <div key={t} onClick={() => setTab(t)} style={{
              padding: '8px 14px', fontSize: 12, cursor: 'pointer',
              fontWeight: t === tab ? 600 : 400, color: t === tab ? W.ink : W.muted,
              borderBottom: t === tab ? `2px solid ${W.ink}` : '2px solid transparent',
              position: 'relative', top: 1,
            }}>{t}</div>
          ))}
        </div>

        {/* === 시장 한눈에 탭 === */}
        {tab === '시장 한눈에' && (
          <div className="w-col" style={{ gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 12 }}>
              <div className="w-card" style={{ padding: 12 }}>
                <h2 className="w-h2" style={{ marginBottom: 8 }}>시장 개요</h2>
                <div className="w-rule" style={{ marginBottom: 8 }} />
                <AreaChart seed="market" width={400} height={130} color={W.ink} />
                <div className="w-row" style={{ gap: 12, marginTop: 8, fontSize: 11 }}>
                  <span>S&P 500 · +0.38%</span><span className="w-faint">|</span>
                  <span>KOSPI · +0.69%</span><span className="w-faint">|</span>
                  <span>VIX · 14.2</span>
                </div>
              </div>

              <div className="w-card" style={{ padding: 12 }}>
                <h2 className="w-h2" style={{ marginBottom: 8 }}>섹터 로테이션 (1M)</h2>
                <div className="w-rule" style={{ marginBottom: 8 }} />
                <div className="w-col" style={{ gap: 4 }}>
                  {[['IT',4.2,true],['반도체',6.8,true],['커뮤니케이션',2.1,true],['금융',0.4,true],['헬스케어',-1.2,false],['에너지',-3.4,false],['유틸리티',-0.8,false]].map(([l,v,up])=>(
                    <div key={l} className="w-row" style={{ gap: 8, fontSize: 11 }}>
                      <div style={{ width: 70 }}>{l}</div>
                      <div className="w-grow" style={{ position: 'relative', height: 10, background: W.fill }}>
                        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: `${Math.abs(v) * 5}%`, transform: up ? 'translateX(0)' : `translateX(-100%)`, background: up ? W.up : W.down, opacity: 0.6 }} />
                        <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: W.line }} />
                      </div>
                      <div className={'w-mono ' + (up ? 'w-up' : 'w-down')} style={{ width: 50, textAlign: 'right', fontSize: 10 }}>{v > 0 ? '+' : ''}{v}%</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-card" style={{ padding: 12 }}>
                <h2 className="w-h2" style={{ marginBottom: 8 }}>스타일 로테이션</h2>
                <div className="w-rule" style={{ marginBottom: 8 }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 4, fontSize: 11 }}>
                  <div></div><div className="w-h3" style={{ fontSize: 9, textAlign: 'center' }}>대형</div><div className="w-h3" style={{ fontSize: 9, textAlign: 'center' }}>소형</div>
                  <div className="w-h3" style={{ fontSize: 9, alignSelf: 'center' }}>그로스</div>
                  <div className="w-card-soft" style={{ padding: 10, textAlign: 'center', background: 'rgba(31,138,91,0.18)' }}>+8.4%</div>
                  <div className="w-card-soft" style={{ padding: 10, textAlign: 'center', background: 'rgba(31,138,91,0.08)' }}>+2.1%</div>
                  <div className="w-h3" style={{ fontSize: 9, alignSelf: 'center' }}>밸류</div>
                  <div className="w-card-soft" style={{ padding: 10, textAlign: 'center' }}>+0.4%</div>
                  <div className="w-card-soft" style={{ padding: 10, textAlign: 'center', background: 'rgba(211,65,65,0.10)' }}>−1.8%</div>
                </div>
                <div className="w-faint" style={{ fontSize: 10, marginTop: 8 }}>이번 분기 대형 그로스 우위</div>
              </div>
            </div>

            <h2 className="w-h2" style={{ marginTop: 4 }}>분석 도구</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { t: '실시간 차트', d: 'TradingView급 캔들·이평·볼린저·RSI·MACD', i: '📈' },
                { t: '재무제표 시각화', d: 'BS / IS / CF — 5년 추이 & 동종업계 비교', i: '📊' },
                { t: '퀀트 스크리너', d: 'PER · PBR · ROE · 모멘텀 · 퀄리티 팩터 필터', i: '🔍' },
                { t: 'DCF 밸류에이션 계산기', d: '가정 슬라이더로 적정주가 추정', i: '💰' },
                { t: '기술적 신호 알림', d: '골든크로스 · RSI 과매수 · 거래량 급증', i: '🔔' },
                { t: '재무 비율 비교', d: '동종업계 / 섹터 평균 대비 백분위', i: '⚖️' },
                { t: '히트맵', d: '시총 가중 트리맵 · S&P 500 / KOSPI', i: '🟩' },
                { t: '시장 심리', d: 'VIX · F&G · V-KOSPI · ADR · 9개 지표', i: '🎯' },
              ].map((tool, i) => (
                <div key={i} className="w-card" style={{ padding: 12, cursor: 'pointer' }}>
                  <div style={{ width: 28, height: 28, border: `1px solid ${W.line}`, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>{tool.i}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{tool.t}</div>
                  <div className="w-faint" style={{ fontSize: 11, lineHeight: 1.4 }}>{tool.d}</div>
                  <div style={{ fontSize: 11, marginTop: 8, color: W.accent }}>열기 →</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === 시장 심리 풀페이지 === */}
        {tab === '시장 심리' && (
          <div className="w-col" style={{ gap: 12 }}>
            <div className="w-card-soft" style={{ padding: 10, fontSize: 11, color: W.muted }}>
              시장 전반의 과열·공포 정도를 미국·한국·글로벌 9개 지표로 진단합니다. 색상 진할수록 극단값.
              <span className="w-faint" style={{ marginLeft: 8 }}>· 갱신 14:32</span>
            </div>

            {/* US */}
            <div>
              <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <h2 className="w-h2">🇺🇸 미국 시장</h2>
                <span className="w-faint" style={{ fontSize: 10 }}>지금 과열인지 / 공포인지</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <SentimentGauge label="VIX" sub="변동성 지수" value={14.2} min={10} max={50}
                  thresholds={[
                    { to: 15, color: W.up, label: 'Calm' },
                    { to: 20, color: '#7aa84a', label: 'Stable' },
                    { to: 30, color: W.muted, label: 'Caution' },
                    { to: 40, color: '#d97c41', label: 'Stress' },
                    { to: 50, color: W.down, label: 'Panic' },
                  ]} />
                <SentimentGauge label="Fear & Greed" sub="CNN · 0–100" value={62} />
                <SentimentGauge label="AAII Bull/Bear" sub="개인 투자자 심리 · 주간" value={42}
                  thresholds={[
                    { to: 25, color: W.down, label: 'Bearish' },
                    { to: 40, color: '#d97c41', label: 'Cautious' },
                    { to: 55, color: W.muted, label: 'Neutral' },
                    { to: 70, color: '#7aa84a', label: 'Bullish' },
                    { to: 100, color: W.up, label: 'Euphoric' },
                  ]} />
              </div>
            </div>

            {/* KR */}
            <div>
              <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <h2 className="w-h2">🇰🇷 한국 시장</h2>
                <span className="w-faint" style={{ fontSize: 10 }}>개인·외국인 흐름과 변동성</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <SentimentGauge label="V-KOSPI" sub="변동성 지수" value={18.4} min={10} max={50}
                  thresholds={[
                    { to: 15, color: W.up, label: 'Calm' },
                    { to: 22, color: '#7aa84a', label: 'Stable' },
                    { to: 30, color: W.muted, label: 'Caution' },
                    { to: 40, color: '#d97c41', label: 'Stress' },
                    { to: 50, color: W.down, label: 'Panic' },
                  ]} />
                <SentimentGauge label="ADR" sub="등락주 비율" value={0.96} min={0.5} max={1.5}
                  thresholds={[
                    { to: 0.7, color: W.down, label: '극매도' },
                    { to: 0.9, color: '#d97c41', label: '매도우위' },
                    { to: 1.05, color: W.muted, label: '균형' },
                    { to: 1.2, color: '#7aa84a', label: '매수우위' },
                    { to: 1.5, color: W.up, label: '극매수' },
                  ]} />
                <SentimentGauge label="신용잔고" sub="개인 레버리지" value={72}
                  thresholds={[
                    { to: 30, color: W.up, label: '낮음' },
                    { to: 50, color: '#7aa84a', label: '안정' },
                    { to: 65, color: W.muted, label: '평균' },
                    { to: 80, color: '#d97c41', label: '과열' },
                    { to: 100, color: W.down, label: '극과열' },
                  ]} />
              </div>
            </div>

            {/* Global */}
            <div>
              <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <h2 className="w-h2">🌐 글로벌 거시</h2>
                <span className="w-faint" style={{ fontSize: 10 }}>옵션 · 밸류에이션 · 달러</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <SentimentGauge label="Put / Call" sub="옵션 풋콜 비율 · 미국" value={0.78} min={0.4} max={1.4}
                  thresholds={[
                    { to: 0.6, color: W.up, label: 'Bullish' },
                    { to: 0.85, color: '#7aa84a', label: 'Neutral+' },
                    { to: 1.0, color: W.muted, label: 'Neutral' },
                    { to: 1.2, color: '#d97c41', label: 'Bearish' },
                    { to: 1.4, color: W.down, label: 'Extreme' },
                  ]} />
                <SentimentGauge label="Buffett Indicator" sub="美 시총 / GDP" value={188} min={50} max={250}
                  thresholds={[
                    { to: 75, color: W.up, label: 'Undervalued' },
                    { to: 100, color: '#7aa84a', label: 'Fair' },
                    { to: 130, color: W.muted, label: 'Modestly Over' },
                    { to: 170, color: '#d97c41', label: 'Overvalued' },
                    { to: 250, color: W.down, label: 'Bubble' },
                  ]} />
                <SentimentGauge label="DXY" sub="달러 인덱스" value={104.2} min={90} max={115}
                  thresholds={[
                    { to: 95, color: W.up, label: '약달러' },
                    { to: 100, color: '#7aa84a', label: '평균-' },
                    { to: 105, color: W.muted, label: '평균' },
                    { to: 110, color: '#d97c41', label: '강달러' },
                    { to: 115, color: W.down, label: '극강달러' },
                  ]} />
              </div>
            </div>

            {/* Composite history */}
            <div className="w-card" style={{ padding: 12 }}>
              <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <h2 className="w-h2">종합 심리 지수 · 12개월 추이</h2>
                <div className="w-row" style={{ gap: 4 }}>
                  <span className="w-pill" style={{ background: W.fill }}>US</span>
                  <span className="w-pill">KR</span>
                  <span className="w-pill">Global</span>
                </div>
              </div>
              <div className="w-rule" style={{ marginBottom: 8 }} />
              <AreaChart seed="sent-history" width={1200} height={140} color={W.accent} />
              <div className="w-row" style={{ gap: 16, marginTop: 8, fontSize: 10 }}>
                <span className="w-row" style={{ gap: 6 }}><span style={{ width: 10, height: 10, background: W.down, opacity: 0.3 }} /> 극공포 (0–25)</span>
                <span className="w-row" style={{ gap: 6 }}><span style={{ width: 10, height: 10, background: W.muted, opacity: 0.3 }} /> 중립 (45–55)</span>
                <span className="w-row" style={{ gap: 6 }}><span style={{ width: 10, height: 10, background: W.up, opacity: 0.3 }} /> 극탐욕 (75+)</span>
                <div className="w-grow" />
                <span className="w-faint">코로나 저점 2020-03 · GFC 2008-10 · 닷컴 2000-03 표기</span>
              </div>
            </div>

            {/* Indicator glossary */}
            <div className="w-card" style={{ padding: 12 }}>
              <h2 className="w-h2" style={{ marginBottom: 8 }}>지표 해설</h2>
              <div className="w-rule" style={{ marginBottom: 8 }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 11 }}>
                {[
                  ['VIX', 'S&P 500 옵션의 향후 30일 예상 변동성. 20+ = 불안.'],
                  ['CNN F&G', '7개 시장 지표를 0–100으로 합성. 25 이하 극공포.'],
                  ['AAII', '미국 개인 투자자 강세/약세 응답 비율 (주간).'],
                  ['V-KOSPI', 'KOSPI 200 옵션의 변동성 지수. 한국판 VIX.'],
                  ['ADR', '상승 종목 수 ÷ 하락 종목 수. 1.0 = 균형.'],
                  ['신용잔고', '개인 빚투 규모. 과열 = 시장 정점 근처 신호.'],
                  ['Put/Call', '풋옵션 / 콜옵션 거래량. 1.0+ = 헤지 수요 증가.'],
                  ['Buffett Indicator', '美 시총 / GDP. 130%+ = 고평가.'],
                  ['DXY', '달러 강도. 강달러 = 신흥국·원자재 약세.'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="w-mono" style={{ fontWeight: 600, marginBottom: 2 }}>{k}</div>
                    <div className="w-faint" style={{ lineHeight: 1.5 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === 다른 탭은 placeholder === */}
        {tab !== '시장 한눈에' && tab !== '시장 심리' && (
          <div className="w-card-soft" style={{ padding: 24, textAlign: 'center', color: W.muted, fontSize: 12 }}>
            "{tab}" 탭 — 별도 아트보드로 정의 (캔버스에서 확인)
          </div>
        )}

        {/* Recent signals (시장 한눈에 탭에서만) */}
        {tab === '시장 한눈에' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
          <div className="w-card" style={{ padding: 12 }}>
            <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <h2 className="w-h2">최근 기술적 신호</h2>
              <span className="w-pill">관심종목 + 보유종목</span>
            </div>
            <div className="w-rule" style={{ marginBottom: 6 }} />
            <div className="w-col" style={{ gap: 6, fontSize: 11 }}>
              {[
                { tk: 'NVDA', sig: '골든크로스 (MA20/60)', t: '오늘 09:42', up: true },
                { tk: 'AAPL', sig: 'RSI 과매수 (78)', t: '오늘 11:15', up: null },
                { tk: '005930', sig: '거래량 +320% 급증', t: '어제', up: true },
                { tk: 'TSLA', sig: 'MACD 데드크로스', t: '5/04', up: false },
                { tk: '000660', sig: '52주 신저가', t: '5/03', up: false },
              ].map((s, i) => (
                <div key={i} className="w-row" style={{ gap: 10 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: s.up === null ? W.muted : (s.up ? W.up : W.down) }} />
                  <span className="w-mono" style={{ width: 70, fontWeight: 600 }}>{s.tk}</span>
                  <span className="w-grow">{s.sig}</span>
                  <span className="w-faint w-mono" style={{ fontSize: 10 }}>{s.t}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="w-card" style={{ padding: 12 }}>
            <h2 className="w-h2" style={{ marginBottom: 8 }}>저장한 스크린</h2>
            <div className="w-rule" style={{ marginBottom: 6 }} />
            <div className="w-col" style={{ gap: 6, fontSize: 11 }}>
              {[
                ['저PER 고ROE', 'PER<15 · ROE>15 · 부채<50%', 28],
                ['모멘텀 50', '6M 수익률 > 섹터 +10%p', 50],
                ['배당 그로스', '5Y 배당성장률 > 8%', 42],
                ['소형 퀄리티', '시총<$2B · 영업이익률>20%', 17],
              ].map((s, i) => (
                <div key={i} className="w-row" style={{ gap: 8, padding: '6px 0', borderBottom: i < 3 ? `1px solid ${W.hairline}` : 'none' }}>
                  <div className="w-grow">
                    <div style={{ fontWeight: 600 }}>{s[0]}</div>
                    <div className="w-faint" style={{ fontSize: 10 }}>{s[1]}</div>
                  </div>
                  <div className="w-mono" style={{ fontSize: 11 }}>{s[2]}건</div>
                  <div style={{ color: W.accent, fontSize: 11 }}>실행 →</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

window.WireAnalysis = WireAnalysis;
