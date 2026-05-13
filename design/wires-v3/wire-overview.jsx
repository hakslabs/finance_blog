// WireProductOverview — high-level project overview for the canvas's 개요 section.
// What is this product · who it's for · key value props · MVP scope · success metrics.
function WireProductOverview() {
  const Section = ({ title, kicker, children }) => (
    <div className="w-card" style={{ padding: 18 }}>
      <div className="w-tag" style={{ marginBottom: 8 }}>{kicker}</div>
      <div className="w-h3" style={{ marginBottom: 10, fontSize: 14 }}>{title}</div>
      {children}
    </div>
  );

  const Row = ({ k, v, faint }) => (
    <div className="w-row" style={{ justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px dashed ${W.hairline}`, gap: 16 }}>
      <span style={{ fontSize: 11, color: W.muted, flexShrink: 0 }}>{k}</span>
      <span style={{ fontSize: 12, textAlign: 'right', color: faint ? W.muted : W.ink }}>{v}</span>
    </div>
  );

  return (
    <div className="w-root" style={{ padding: '28px 32px', background: '#fafafa', overflow: 'auto' }}>
      <div className="w-tag" style={{ marginBottom: 8 }}>Project Overview · v3</div>
      <h1 className="w-h1" style={{ marginBottom: 6, fontSize: 22 }}>STOCKLAB</h1>
      <div className="w-muted" style={{ marginBottom: 6, fontSize: 13, maxWidth: 760 }}>
        해외/국내 주식을 <b>분석하고, 학습하고, 복기하는</b> 1인 투자자용 워크벤치.
        가격 추종이 아니라 <b>매수 근거 → 시장 반응 → 복기</b>의 사이클을 명시적으로 도구화한다.
      </div>
      <div className="w-muted" style={{ marginBottom: 22, fontSize: 11 }}>
        Stack: Next.js + Supabase · 데이터: yFinance · Alpha Vantage · FMP · SEC EDGAR · DART · RSS 30+ · Gemini AI 요약
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
        <Section kicker="WHO" title="타깃 사용자">
          <div style={{ fontSize: 12, lineHeight: 1.7 }}>
            · 자기주도형 <b>중·장기 투자자</b><br/>
            · 미국/한국 동시 추적<br/>
            · 가치투자·퀀트 입문 1–3년차<br/>
            · 뉴스/공시 직접 해석하고 싶은 사람
          </div>
          <div className="w-faint" style={{ fontSize: 10, marginTop: 8, fontStyle: 'italic' }}>
            ❌ 단타·옵션·테마 추격형 아님
          </div>
        </Section>

        <Section kicker="WHY" title="핵심 가치 제안">
          <ol style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, lineHeight: 1.7 }}>
            <li><b>판단을 남긴다</b> — 매수 thesis 잠금, 사후 합리화 방지</li>
            <li><b>시장 반응을 알람으로</b> — ±10/20/50% · 실적일 · 공시 트리거</li>
            <li><b>고수 13F를 따라본다</b> — 분기 자동 파싱</li>
            <li><b>리포트 AI 요약</b> — 30+ 소스 → 5문장</li>
          </ol>
        </Section>

        <Section kicker="MVP" title="MVP 범위">
          <Row k="포함" v="홈 · 분석 · 종목 상세 8탭 · 포폴 · Thesis · 알람 · 리포트" />
          <Row k="포함" v="고수 13F · 학습 · 모바일 2화면" />
          <Row k="제외" v="실시간 호가 · 자동 매매 · 옵션 · 알림 푸시" faint />
          <Row k="제외" v="커뮤니티 · 댓글 · 공유" faint />
        </Section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, marginBottom: 14 }}>
        <Section kicker="FLOW" title="핵심 사용 시나리오">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
            <div className="w-row" style={{ gap: 8, alignItems: 'flex-start' }}>
              <span className="w-tag" style={{ flexShrink: 0 }}>1</span>
              <div>
                <b>매수 전 thesis 작성</b><br/>
                <span className="w-muted" style={{ fontSize: 11 }}>
                  종목 검색 → 종목 상세 (적정가치 · 재무 · 수급) → 포폴 진입 시 thesis · 청산 조건 · 알람 임계치 입력 → 🔒 잠금
                </span>
              </div>
            </div>
            <div className="w-row" style={{ gap: 8, alignItems: 'flex-start' }}>
              <span className="w-tag" style={{ flexShrink: 0 }}>2</span>
              <div>
                <b>알람 발동 → 반응 메모</b><br/>
                <span className="w-muted" style={{ fontSize: 11 }}>
                  ±10% 도달 · 실적일 · 공시 → 홈 「오늘 할 일」 / 마이페이지 「반응 메모 필요」 → "왜 움직였다고 생각하나?" 입력
                </span>
              </div>
            </div>
            <div className="w-row" style={{ gap: 8, alignItems: 'flex-start' }}>
              <span className="w-tag" style={{ flexShrink: 0 }}>3</span>
              <div>
                <b>매도 후 복기</b><br/>
                <span className="w-muted" style={{ fontSize: 11 }}>
                  포지션 청산 → thesis vs 실제 결과 대비 → 실수 태그 (시점 · 사이즈 · 시나리오 누락 등) → 학습 자산화
                </span>
              </div>
            </div>
          </div>
        </Section>

        <Section kicker="DATA" title="데이터 소스">
          <Row k="가격 / 차트" v="yFinance · Alpha Vantage" />
          <Row k="재무" v="FMP · DART" />
          <Row k="공시" v="SEC EDGAR · DART" />
          <Row k="13F (고수)" v="WhaleWisdom + 자체 파싱" />
          <Row k="뉴스" v="RSS 30+ → Gemini AI 요약" />
          <Row k="환율 · 거시" v="FRED · ECOS" />
          <div className="w-faint" style={{ fontSize: 10, marginTop: 8, fontStyle: 'italic' }}>
            전 소스 무료 티어 내 — 운영 보드에서 cron 한도 검증
          </div>
        </Section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <Section kicker="NORTHSTAR" title="성공 지표 (북극성)">
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Thesis 작성률</div>
          <div className="w-muted" style={{ fontSize: 11, marginBottom: 12 }}>
            보유 포지션 중 thesis 잠금된 비율. MVP 목표 60%+.
          </div>
          <Row k="보조 1" v="알람 → 메모 응답률" />
          <Row k="보조 2" v="복기 작성 거래 / 매도 거래" />
          <Row k="보조 3" v="주간 능동 사용일 (WAU days)" />
        </Section>

        <Section kicker="PRINCIPLES" title="설계 원칙">
          <ol style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, lineHeight: 1.7 }}>
            <li><b>조회 → 행동</b> 전환 장치를 모든 화면에</li>
            <li>판단은 <b>잠금</b>, 결과는 <b>나중에</b></li>
            <li>차트보다 <b>맥락</b> (공시 · 수급 · 적정가치)</li>
            <li>1인 사용 — <b>커뮤니티 노이즈 없음</b></li>
            <li>다크모드 · 한·미 동시 · 모바일 우선 2화면</li>
          </ol>
        </Section>

        <Section kicker="OPEN QUESTIONS" title="아직 결정 안 한 것">
          <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, lineHeight: 1.7, color: W.muted }}>
            <li>알람 채널 — 이메일만? 텔레그램? 카톡 알림톡?</li>
            <li>거래 입력 — 수동만? 증권사 CSV 임포트?</li>
            <li>유료화 모델 — 무료/구독/원샷?</li>
            <li>모바일 — PWA 우선 vs 네이티브 후순위</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}

Object.assign(window, { WireProductOverview });
