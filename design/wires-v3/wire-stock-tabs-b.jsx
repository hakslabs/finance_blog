// Stock Detail sub-tabs B — 공시·실적 / 뉴스 / 수급 / 목표주가
// STK_HEADER 는 wire-stock-tabs-a.jsx 에 정의됨 (글로벌 스코프)

// Tab 5 — 공시·실적
function WireStockFilings() {
  return (
    <div className="w-root">
      <AppBar active="" />
      <STK_HEADER tabActive="공시·실적" />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
          <div className="w-card" style={{ padding: 12 }}>
            <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <h2 className="w-h2">실적 발표 트렌드</h2>
              <span className="w-faint" style={{ fontSize: 10 }}>20분기</span>
            </div>
            <div className="w-rule" style={{ marginBottom: 8 }} />
            <BarChart seed="earn-trend" width={680} height={180} bars={20} />
            <div className="w-row" style={{ marginTop: 8, gap: 16, fontSize: 11 }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: W.up, marginRight: 4 }} />어닝 서프라이즈 (15회)</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: W.down, marginRight: 4 }} />어닝 미스 (3회)</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: W.muted, marginRight: 4 }} />컨센 일치 (2회)</span>
            </div>
          </div>
          <div className="w-card" style={{ padding: 12 }}>
            <h2 className="w-h2" style={{ marginBottom: 8 }}>다음 실적 발표</h2>
            <div className="w-rule" style={{ marginBottom: 8 }} />
            <div className="w-col" style={{ gap: 6, fontSize: 11 }}>
              <div><span className="w-faint">예정일</span> · <span className="w-mono">2026-02-26 (D-43)</span></div>
              <div><span className="w-faint">분기</span> · FY26 Q4</div>
              <div><span className="w-faint">시점</span> · 장 마감 후 (After Hours)</div>
              <div className="w-rule" style={{ margin: '6px 0' }} />
              <div className="w-h3" style={{ fontSize: 9, marginTop: 4 }}>컨센서스 추정</div>
              <div className="w-row" style={{ justifyContent: 'space-between' }}><span>매출</span><span className="w-mono">$38.2B</span></div>
              <div className="w-row" style={{ justifyContent: 'space-between' }}><span>EPS</span><span className="w-mono">$0.89</span></div>
              <div className="w-row" style={{ justifyContent: 'space-between' }}><span>영업이익률</span><span className="w-mono">63.8%</span></div>
              <button className="w-btn-primary w-btn" style={{ marginTop: 8, width: '100%' }}>🔔 실적 알림 받기</button>
            </div>
          </div>
        </div>

        <div className="w-card" style={{ padding: 12 }}>
          <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <h2 className="w-h2">공시 타임라인</h2>
            <div className="w-row" style={{ gap: 4 }}>
              {['전체','실적','정정','거버넌스','M&A'].map((t,i) => (
                <span key={t} className="w-pill" style={{ background: i === 0 ? W.fill : W.bg }}>{t}</span>
              ))}
            </div>
          </div>
          <div className="w-rule" style={{ marginBottom: 8 }} />
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: W.fill }}>
              <th style={{ padding: 6, textAlign: 'left', width: 100 }}>제출일</th>
              <th style={{ padding: 6, textAlign: 'left', width: 80 }}>구분</th>
              <th style={{ padding: 6, textAlign: 'left' }}>제목</th>
              <th style={{ padding: 6, textAlign: 'left', width: 90 }}>당일 주가</th>
              <th style={{ padding: 6, textAlign: 'right', width: 70 }}>원문</th>
            </tr></thead>
            <tbody>
              {[
                ['2025-11-19', '8-K', 'FY26 Q3 실적 발표', '+8.4%', W.up],
                ['2025-11-15', '4', 'CFO 주식 매도 (10K shares)', '−1.2%', W.down],
                ['2025-10-30', '10-Q', 'FY26 Q2 분기 보고서', '+2.1%', W.up],
                ['2025-10-12', '8-K', '데이터센터 신규 계약 발표', '+4.6%', W.up],
                ['2025-09-15', '14A', '주주총회 안건 위임장', '−0.3%', W.muted],
                ['2025-08-28', '8-K', 'FY26 Q1 실적 발표', '+5.7%', W.up],
                ['2025-07-22', '8-K', '자사주 매입 $50B 승인', '+3.4%', W.up],
                ['2025-06-04', 'S-3', '증권 등록 (혼합 증권)', '−0.8%', W.muted],
              ].map((r,i) => (
                <tr key={i}>
                  <td className="w-mono" style={{ padding: 6, borderBottom: `1px solid ${W.hairline}` }}>{r[0]}</td>
                  <td style={{ padding: 6, borderBottom: `1px solid ${W.hairline}` }}><span className="w-pill" style={{ fontSize: 9 }}>{r[1]}</span></td>
                  <td style={{ padding: 6, borderBottom: `1px solid ${W.hairline}` }}>{r[2]}</td>
                  <td className="w-mono" style={{ padding: 6, color: r[4], borderBottom: `1px solid ${W.hairline}` }}>{r[3]}</td>
                  <td style={{ padding: 6, textAlign: 'right', borderBottom: `1px solid ${W.hairline}` }}><span className="w-faint" style={{ fontSize: 10 }}>EDGAR ↗</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="w-faint" style={{ fontSize: 10, marginTop: 8, textAlign: 'center' }}>출처: SEC EDGAR · 미국주 / DART (한국주) · 갱신 매일 18:00</div>
        </div>
      </div>
    </div>
  );
}

// Tab 6 — 뉴스
function WireStockNews() {
  return (
    <div className="w-root">
      <AppBar active="" />
      <STK_HEADER tabActive="뉴스" />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        <div className="w-row" style={{ gap: 6 }}>
          <span className="w-pill" style={{ background: W.fill }}>전체 (87)</span>
          <span className="w-pill">한국어 (34)</span>
          <span className="w-pill">영문 (53)</span>
          <div className="w-vrule" />
          <span className="w-pill">실적</span>
          <span className="w-pill">제품</span>
          <span className="w-pill">M&A</span>
          <span className="w-pill">애널리스트</span>
          <span className="w-pill">매크로</span>
          <div className="w-grow" />
          <span className="w-faint" style={{ fontSize: 10, alignSelf: 'center' }}>최신순</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
          <div className="w-col" style={{ gap: 8 }}>
            {[
              ['2025-12-19 14:32', 'Reuters', 'Nvidia tops Q3 estimates as data-center revenue jumps 94%', '★★★', W.up, 'AI 인프라 수요 지속·중국 수출 규제에도 매출 사상 최고치'],
              ['2025-12-19 11:08', 'Bloomberg', 'Druckenmiller adds to NVDA position in Q3 13F filing', '★★', W.up, '듀켄밀러 패밀리오피스 NVDA 비중 확대 — Q3 13F 공시'],
              ['2025-12-18 22:14', '연합뉴스', '엔비디아 시총 3.6조달러 돌파 — AI 사이클 정점 논쟁', '★★', W.muted, '국내 증권가 의견 — 단기 과열 vs 구조적 성장'],
              ['2025-12-18 09:45', 'WSJ', 'Morgan Stanley raises NVDA target to $185 from $170', '★★', W.up, '데이터센터 가속기 점유율 88% 유지 전망'],
              ['2025-12-17 18:30', 'CNBC', 'Cathie Wood\'s ARK trims NVDA in favor of Tesla Robotaxi play', '★', W.down, 'ARK 4분기 NVDA 비중 −8% 조정'],
              ['2025-12-17 14:22', '한국경제', '삼성전자 HBM 엔비디아 공급 본격화 전망', '★★', W.up, 'HBM3E 12단 공급 협의 마무리 단계'],
            ].map((r,i) => (
              <div key={i} className="w-card" style={{ padding: 10 }}>
                <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                  <div className="w-row" style={{ gap: 6, fontSize: 10 }}>
                    <span className="w-mono w-faint">{r[0]}</span>
                    <span className="w-pill" style={{ fontSize: 9 }}>{r[1]}</span>
                    <span style={{ color: r[4] }}>{r[3]}</span>
                  </div>
                  <span className="w-faint" style={{ fontSize: 10 }}>↗</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{r[2]}</div>
                <div className="w-faint" style={{ fontSize: 11 }}>{r[5]}</div>
              </div>
            ))}
          </div>

          <div className="w-col" style={{ gap: 12 }}>
            <div className="w-card" style={{ padding: 12 }}>
              <h2 className="w-h2" style={{ marginBottom: 8 }}>AI 뉴스 요약</h2>
              <div className="w-rule" style={{ marginBottom: 8 }} />
              <div className="w-faint" style={{ fontSize: 11, lineHeight: 1.6 }}>
                지난 7일간 NVDA 관련 뉴스 87건 중 긍정 64%, 중립 28%, 부정 8%. 핵심 키워드는
                <strong style={{ color: W.ink }}> "데이터센터", "HBM3E", "13F 매수", "목표가 상향" </strong>
                순. 부정 뉴스는 ARK 비중 축소와 중국 수출 규제 우려가 중심.
              </div>
              <div className="w-faint" style={{ fontSize: 9, marginTop: 8 }}>출처: Gemini 1.5 Flash · 매 6시간 갱신</div>
            </div>
            <div className="w-card" style={{ padding: 12 }}>
              <h2 className="w-h2" style={{ marginBottom: 8 }}>키워드 트렌드</h2>
              <div className="w-rule" style={{ marginBottom: 8 }} />
              <div className="w-col" style={{ gap: 6, fontSize: 11 }}>
                {[['데이터센터', 47, W.up],['HBM', 32, W.up],['목표가 상향', 18, W.up],['중국 규제', 12, W.down],['Q4 가이던스', 9, W.muted],['Robotaxi', 6, W.muted]].map(([l,v,c],i) => (
                  <div key={i}>
                    <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 2 }}>
                      <span>{l}</span><span className="w-mono w-faint">{v}건</span>
                    </div>
                    <div style={{ height: 4, background: W.fill }}>
                      <div style={{ width: `${(v/47)*100}%`, height: '100%', background: c }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab 7 — 수급 (한국주: 외국인/기관/개인 매매동향, 미국주: institutional ownership)
function WireStockSupplyDemand() {
  return (
    <div className="w-root">
      <AppBar active="" />
      <STK_HEADER tabActive="수급" />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        <div className="w-card-soft" style={{ padding: 8, fontSize: 11, color: W.muted }}>
          ⚠ 미국주는 분기별 13F 기관 보유 데이터만 제공 (한국주는 일별 외국인·기관 매매 KRX 무료 제공)
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
          {[
            ['외국인 보유율', '79.4%', '+0.3%p · 7일', W.up],
            ['기관 보유율', '8.2%', '−0.1%p · 7일', W.down],
            ['공매도 잔고', '0.42%', '낮은 수준', W.muted],
            ['공매도 일평균', '$420M', '+18% · 30일', W.down],
          ].map(([l,v,d,c],i) => (
            <div key={i} className="w-card" style={{ padding: 12 }}>
              <div className="w-h3">{l}</div>
              <div className="w-num-md" style={{ marginTop: 4 }}>{v}</div>
              <div className="w-mono" style={{ color: c, fontSize: 10, marginTop: 2 }}>{d}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="w-card" style={{ padding: 12 }}>
            <h2 className="w-h2" style={{ marginBottom: 8 }}>외국인·기관 매매동향 (30일)</h2>
            <div className="w-rule" style={{ marginBottom: 8 }} />
            <BarChart seed="foreign-flow" width={460} height={160} bars={30} />
            <div className="w-row" style={{ marginTop: 8, gap: 12, fontSize: 11 }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: W.up, marginRight: 4 }} />외국인 순매수</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: W.accent, marginRight: 4 }} />기관 순매수</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: W.muted, marginRight: 4 }} />개인</span>
            </div>
          </div>
          <div className="w-card" style={{ padding: 12 }}>
            <h2 className="w-h2" style={{ marginBottom: 8 }}>공매도 잔고 추이 (90일)</h2>
            <div className="w-rule" style={{ marginBottom: 8 }} />
            <AreaChart seed="short-trend" width={460} height={160} color={W.down} />
            <div className="w-faint" style={{ fontSize: 10, marginTop: 4 }}>최근 30일 누적 공매도 잔고 +18% 증가</div>
          </div>
        </div>

        <div className="w-card" style={{ padding: 12 }}>
          <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <h2 className="w-h2">대형 보유 기관 — 13F 최근 변경</h2>
            <span className="w-faint" style={{ fontSize: 10 }}>2025 Q3 기준</span>
          </div>
          <div className="w-rule" style={{ marginBottom: 8 }} />
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: W.fill }}>
              <th style={{ padding: 6, textAlign: 'left' }}>기관</th>
              <th style={{ padding: 6, textAlign: 'right' }}>보유 주식 수</th>
              <th style={{ padding: 6, textAlign: 'right' }}>가치</th>
              <th style={{ padding: 6, textAlign: 'right' }}>비중</th>
              <th style={{ padding: 6, textAlign: 'right' }}>전 분기 대비</th>
              <th style={{ padding: 6, textAlign: 'right' }}>최근 활동</th>
            </tr></thead>
            <tbody>
              {[
                ['Vanguard', '2.1B', '$311B', '8.5%', '+0.2%', '소폭 매수'],
                ['BlackRock', '1.8B', '$267B', '7.3%', '+0.1%', '소폭 매수'],
                ['State Street', '0.9B', '$133B', '3.7%', '0.0%', '유지'],
                ['Fidelity', '0.6B', '$89B', '2.4%', '−0.3%', '매도'],
                ['T. Rowe Price', '0.3B', '$44B', '1.2%', '−0.1%', '매도'],
                ['Geode Capital', '0.3B', '$44B', '1.2%', '+0.05%', '매수'],
              ].map((r,i) => (
                <tr key={i}>
                  <td style={{ padding: 6, borderBottom: `1px solid ${W.hairline}` }}>{r[0]}</td>
                  <td className="w-mono" style={{ padding: 6, textAlign: 'right', borderBottom: `1px solid ${W.hairline}` }}>{r[1]}</td>
                  <td className="w-mono" style={{ padding: 6, textAlign: 'right', borderBottom: `1px solid ${W.hairline}` }}>{r[2]}</td>
                  <td className="w-mono" style={{ padding: 6, textAlign: 'right', borderBottom: `1px solid ${W.hairline}` }}>{r[3]}</td>
                  <td className="w-mono" style={{ padding: 6, textAlign: 'right', color: r[4].startsWith('+') ? W.up : (r[4].startsWith('−') ? W.down : W.muted), borderBottom: `1px solid ${W.hairline}` }}>{r[4]}</td>
                  <td style={{ padding: 6, textAlign: 'right', fontSize: 10, borderBottom: `1px solid ${W.hairline}` }}>{r[5]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Tab 8 — 목표주가 (애널리스트 컨센서스 + 고수 보유 통합)
function WireStockTargets() {
  return (
    <div className="w-root">
      <AppBar active="" />
      <STK_HEADER tabActive="목표주가" />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
          {[
            ['평균 목표가', '$165.00', '+11.3% 상승여력', W.up],
            ['최고 목표가', '$220.00', 'Wedbush', W.up],
            ['최저 목표가', '$95.00', 'Morningstar', W.down],
            ['커버 애널리스트', '52명', '매수 41 · 보유 9 · 매도 2', W.muted],
          ].map(([l,v,d,c],i) => (
            <div key={i} className="w-card" style={{ padding: 12 }}>
              <div className="w-h3">{l}</div>
              <div className="w-num-md" style={{ marginTop: 4 }}>{v}</div>
              <div className="w-mono" style={{ color: c, fontSize: 10, marginTop: 2 }}>{d}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 12 }}>
          <div className="w-card" style={{ padding: 12 }}>
            <h2 className="w-h2" style={{ marginBottom: 8 }}>목표가 분포</h2>
            <div className="w-rule" style={{ marginBottom: 8 }} />
            <BarChart seed="target-dist" width={580} height={160} bars={22} />
            <div className="w-row" style={{ justifyContent: 'space-between', marginTop: 4, fontSize: 10 }}>
              <span className="w-faint">$95</span>
              <span className="w-mono">현재가 $148.20</span>
              <span className="w-faint">$220</span>
            </div>
          </div>
          <div className="w-card" style={{ padding: 12 }}>
            <h2 className="w-h2" style={{ marginBottom: 8 }}>의견 분포</h2>
            <div className="w-rule" style={{ marginBottom: 8 }} />
            <div className="w-col" style={{ gap: 8 }}>
              {[['강력 매수', 28, W.up],['매수', 13, '#7da874'],['보유', 9, W.muted],['매도', 1, '#c08383'],['강력 매도', 1, W.down]].map(([l,v,c],i) => (
                <div key={i}>
                  <div className="w-row" style={{ justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                    <span>{l}</span><span className="w-mono">{v}명</span>
                  </div>
                  <div style={{ height: 8, background: W.fill }}>
                    <div style={{ width: `${(v/28)*100}%`, height: '100%', background: c }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-card" style={{ padding: 12 }}>
          <div className="w-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <h2 className="w-h2">최근 애널리스트 리포트</h2>
            <span className="w-faint" style={{ fontSize: 10 }}>30일</span>
          </div>
          <div className="w-rule" style={{ marginBottom: 8 }} />
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: W.fill }}>
              <th style={{ padding: 6, textAlign: 'left' }}>날짜</th>
              <th style={{ padding: 6, textAlign: 'left' }}>증권사 / 애널리스트</th>
              <th style={{ padding: 6, textAlign: 'left' }}>의견 변경</th>
              <th style={{ padding: 6, textAlign: 'right' }}>이전 목표가</th>
              <th style={{ padding: 6, textAlign: 'right' }}>신규 목표가</th>
              <th style={{ padding: 6, textAlign: 'left' }}>핵심 코멘트</th>
            </tr></thead>
            <tbody>
              {[
                ['12-18', 'Morgan Stanley · J. Moore', '매수 → 매수', '$170', '$185', '데이터센터 가속기 점유율 88% 유지'],
                ['12-15', 'Wedbush · D. Ives', '강력매수 → 강력매수', '$200', '$220', 'AI 슈퍼사이클 2027년까지 지속'],
                ['12-12', 'Bank of America · V. Arya', '매수 → 매수', '$180', '$190', 'Blackwell 출하 가속'],
                ['12-08', 'Goldman Sachs · T. Hari', '매수 → 매수', '$175', '$175', '실적 컨센서스 상향'],
                ['12-01', 'Morningstar · B. Colello', '보유 → 보유', '$110', '$95', '고PER 부담 — 적정주가 하향'],
                ['11-25', 'JPMorgan · H. Sur', '매수 → 매수', '$170', '$180', '경쟁 우위 지속'],
              ].map((r,i) => (
                <tr key={i}>
                  <td className="w-mono" style={{ padding: 6, borderBottom: `1px solid ${W.hairline}` }}>{r[0]}</td>
                  <td style={{ padding: 6, borderBottom: `1px solid ${W.hairline}` }}>{r[1]}</td>
                  <td style={{ padding: 6, borderBottom: `1px solid ${W.hairline}` }}><span className="w-pill" style={{ fontSize: 9 }}>{r[2]}</span></td>
                  <td className="w-mono w-faint" style={{ padding: 6, textAlign: 'right', borderBottom: `1px solid ${W.hairline}` }}>{r[3]}</td>
                  <td className="w-mono" style={{ padding: 6, textAlign: 'right', borderBottom: `1px solid ${W.hairline}` }}>{r[4]}</td>
                  <td className="w-faint" style={{ padding: 6, fontSize: 10, borderBottom: `1px solid ${W.hairline}` }}>{r[5]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="w-card" style={{ padding: 12 }}>
          <h2 className="w-h2" style={{ marginBottom: 8 }}>이 종목을 보유한 고수 (13F)</h2>
          <div className="w-rule" style={{ marginBottom: 8 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[
              ['Stanley Druckenmiller', '듀켄밀러 패밀리오피스', '비중 12.4%', '+ 매수 Q3', W.up],
              ['Bill Ackman', 'Pershing Square', '비중 8.1%', '신규 매수', W.up],
              ['Cathie Wood', 'ARK Invest', '비중 4.8%', '− 8% Q3', W.down],
              ['Buffett', 'Berkshire', '미보유', '—', W.muted],
              ['Burry', 'Scion', '미보유 (Put 옵션)', '+ Q3', W.down],
              ['Soros', 'Soros Fund', '비중 3.2%', '신규', W.up],
            ].map(([n,f,b,c,col],i) => (
              <div key={i} className="w-card-soft" style={{ padding: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{n}</div>
                <div className="w-faint" style={{ fontSize: 10 }}>{f}</div>
                <div className="w-row" style={{ justifyContent: 'space-between', marginTop: 6, fontSize: 11 }}>
                  <span>{b}</span>
                  <span className="w-mono" style={{ color: col }}>{c}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.WireStockFilings = WireStockFilings;
window.WireStockNews = WireStockNews;
window.WireStockSupplyDemand = WireStockSupplyDemand;
window.WireStockTargets = WireStockTargets;
