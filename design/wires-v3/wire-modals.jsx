// Shared modal + toast system. Wire any button with:
//   onClick={() => openModal('trade', { ticker: 'NVDA', side: '매수' })}
//   onClick={() => toast('저장됨')}

(function () {
  const _listeners = [];
  window.openModal = (type, data = {}) => _listeners.forEach(l => l({ type, data }));
  window._registerModalHost = (fn) => { _listeners.push(fn); return () => _listeners.splice(_listeners.indexOf(fn), 1); };

  const _toastListeners = [];
  window.toast = (msg, kind = 'ok') => _toastListeners.forEach(l => l({ msg, kind, id: Date.now() + Math.random() }));
  window._registerToastHost = (fn) => { _toastListeners.push(fn); return () => _toastListeners.splice(_toastListeners.indexOf(fn), 1); };
})();

function ModalShell({ title, sub, children, onClose, width = 520, footer }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,15,15,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div onClick={e => e.stopPropagation()} className="w-card" style={{ width, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 32px)', background: W.bg, padding: 0, display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}>
        <div className="w-row" style={{ padding: '10px 14px', borderBottom: `1px solid ${W.hairline}`, justifyContent: 'space-between', background: W.fill }}>
          <div>
            <div className="w-h2">{title}</div>
            {sub && <div className="w-faint" style={{ fontSize: 10.5, marginTop: 2 }}>{sub}</div>}
          </div>
          <span onClick={onClose} style={{ cursor: 'pointer', fontSize: 14, color: W.muted }}>✕</span>
        </div>
        <div style={{ padding: 14, overflow: 'auto', flex: 1 }}>{children}</div>
        {footer && <div className="w-row" style={{ padding: '10px 14px', borderTop: `1px solid ${W.hairline}`, gap: 8, justifyContent: 'flex-end', background: W.fill }}>{footer}</div>}
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="w-h3" style={{ fontSize: 9.5, marginBottom: 4 }}>{label}</div>
      {children}
      {hint && <div className="w-faint" style={{ fontSize: 10, marginTop: 3 }}>{hint}</div>}
    </div>
  );
}
const inputStyle = { width: '100%', padding: '6px 10px', fontSize: 12, border: `1px solid ${W.line}`, background: W.bg, fontFamily: 'inherit' };
const monoInput = { ...inputStyle, fontFamily: 'ui-monospace, SFMono-Regular, monospace' };

// ─── Trade modal ─────────────────────────────────────────────────────
function TradeModal({ data, onClose }) {
  const [side, setSide] = React.useState(data.side || '매수');
  const ticker = data.ticker || 'AAPL';
  return (
    <ModalShell title={`+ 거래 기록 — ${ticker}`} sub="매수 / 매도 / 배당 / 입출금 기록" onClose={onClose}
      footer={<>
        <button className="w-btn" onClick={onClose}>취소</button>
        <button className="w-btn-primary w-btn" onClick={() => { onClose(); toast(`${side} 기록 저장됨`); }}>저장</button>
      </>}>
      <Field label="거래 종류">
        <div className="w-row" style={{ gap: 4 }}>
          {['매수', '매도', '배당', '입금', '출금'].map(s => (
            <span key={s} onClick={() => setSide(s)} className="w-pill" style={{ cursor: 'pointer', background: side === s ? W.ink : W.bg, color: side === s ? '#fff' : W.muted, borderColor: side === s ? W.ink : W.hairline }}>{s}</span>
          ))}
        </div>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="종목"><input style={inputStyle} defaultValue={ticker} /></Field>
        <Field label="거래일"><input style={inputStyle} type="date" defaultValue="2026-05-06" /></Field>
        <Field label="수량"><input style={monoInput} defaultValue="10" /></Field>
        <Field label="단가"><input style={monoInput} defaultValue="912.18" /></Field>
        <Field label="통화">
          <select style={inputStyle}><option>USD</option><option>KRW</option><option>JPY</option></select>
        </Field>
        <Field label="수수료"><input style={monoInput} defaultValue="0.00" /></Field>
      </div>
      <Field label="메모 (선택)" hint="청산이라면 이 거래의 복기는 거래내역 행에서 추가합니다."><textarea style={{ ...inputStyle, minHeight: 60 }} placeholder="리밸런싱 / 추가매수 / 손절 등" /></Field>
    </ModalShell>
  );
}

// ─── Alert modal ─────────────────────────────────────────────────────
function AlertModal({ data, onClose }) {
  const [conds, setConds] = React.useState({ pct10: true, pct20: true, pct50: false, earn: true, disc: true, vol: false });
  const ticker = data.ticker || 'NVDA';
  return (
    <ModalShell title={`🔔 알람 설정 — ${ticker}`} sub="임계치 도달 시 「오늘 할 일」에 반응 메모 요청이 표시됩니다" onClose={onClose}
      footer={<>
        <button className="w-btn" onClick={onClose}>취소</button>
        <button className="w-btn-primary w-btn" onClick={() => { onClose(); toast('알람 저장됨'); }}>저장</button>
      </>}>
      <Field label="가격 변동 (매수가 또는 최근 종가 대비)">
        {[
          ['pct10', '±10% 도달', '경고 신호 — 1차 점검'],
          ['pct20', '±20% 도달', 'Thesis 재검토'],
          ['pct50', '±50% 도달', '청산 / 추가매수 결정'],
        ].map(([k, l, d]) => (
          <label key={k} className="w-row" style={{ gap: 8, padding: '4px 0', fontSize: 11.5, cursor: 'pointer' }}>
            <input type="checkbox" checked={conds[k]} onChange={e => setConds({ ...conds, [k]: e.target.checked })} />
            <span style={{ fontWeight: 500 }}>{l}</span>
            <span className="w-faint" style={{ fontSize: 10 }}>{d}</span>
          </label>
        ))}
      </Field>
      <Field label="이벤트 알람">
        {[
          ['earn', '실적 발표 D-1'],
          ['disc', '주요 공시 (8-K, 정정공시)'],
          ['vol', '거래량 평균 대비 +200%'],
        ].map(([k, l]) => (
          <label key={k} className="w-row" style={{ gap: 8, padding: '4px 0', fontSize: 11.5, cursor: 'pointer' }}>
            <input type="checkbox" checked={conds[k]} onChange={e => setConds({ ...conds, [k]: e.target.checked })} />
            <span>{l}</span>
          </label>
        ))}
      </Field>
      <Field label="알림 채널">
        <div className="w-row" style={{ gap: 4 }}>
          {['앱 알림', '이메일', 'SMS'].map((c, i) => (
            <span key={c} className="w-pill" style={{ cursor: 'pointer', background: i < 2 ? W.ink : W.bg, color: i < 2 ? '#fff' : W.muted, borderColor: i < 2 ? W.ink : W.hairline }}>{c}</span>
          ))}
        </div>
      </Field>
    </ModalShell>
  );
}

// ─── Thesis modal ─────────────────────────────────────────────────────
function ThesisModal({ data, onClose }) {
  const [checks, setChecks] = React.useState({ model: false, reason: false, exit: false });
  const all = checks.model && checks.reason && checks.exit;
  const ticker = data.ticker || 'NVDA';
  return (
    <ModalShell title={`+ ${ticker} Thesis 작성`} sub="매수 시점의 판단 기준 — 잠그면 사후 편집 불가" onClose={onClose} width={620}
      footer={<>
        <button className="w-btn" onClick={onClose}>나중에</button>
        <button className="w-btn" onClick={() => { onClose(); toast('초안 저장됨'); }}>초안 저장</button>
        <button className={all ? 'w-btn-primary w-btn' : 'w-btn'} disabled={!all} onClick={() => { onClose(); toast('🔒 Thesis 잠금 완료'); }} style={{ opacity: all ? 1 : 0.4 }}>🔒 잠금</button>
      </>}>
      <Field label="수익모델 — 회사가 어떻게 돈을 버는가">
        <textarea style={{ ...inputStyle, minHeight: 60 }} placeholder="예: 데이터센터 GPU 매출이 전체의 80%, AI 추론 수요와 직결" onChange={e => setChecks({ ...checks, model: e.target.value.length > 0 })} />
      </Field>
      <Field label="매수 근거 — 지금 사는 이유">
        <textarea style={{ ...inputStyle, minHeight: 60 }} placeholder="예: 매출 YoY +200%, AI capex 사이클 초기, 경쟁사 대비 PSR 프리미엄 정당화 가능" onChange={e => setChecks({ ...checks, reason: e.target.value.length > 0 })} />
      </Field>
      <Field label="청산 기준 — 언제 팔지">
        <textarea style={{ ...inputStyle, minHeight: 60 }} placeholder="예: ① DC 매출 YoY 둔화 (분기 2회 연속 +50% 미만) / ② PSR 30 이상 / ③ -25% 손절선" onChange={e => setChecks({ ...checks, exit: e.target.value.length > 0 })} />
      </Field>
      <div className="w-card-soft" style={{ padding: 8, fontSize: 11, background: all ? 'rgba(46,139,87,0.06)' : 'transparent' }}>
        체크리스트 — {[checks.model, checks.reason, checks.exit].filter(Boolean).length}/3
      </div>
    </ModalShell>
  );
}

// ─── CSV / Misc modals ─────────────────────────────────────────────────
function CsvModal({ data, onClose }) {
  return (
    <ModalShell title={data.mode === 'export' ? 'CSV 내보내기' : 'CSV 가져오기'} onClose={onClose}
      footer={<>
        <button className="w-btn" onClick={onClose}>취소</button>
        <button className="w-btn-primary w-btn" onClick={() => { onClose(); toast(data.mode === 'export' ? 'CSV 다운로드 시작' : 'CSV 임포트 완료 · 12건'); }}>{data.mode === 'export' ? '내보내기' : '가져오기'}</button>
      </>}>
      {data.mode === 'export' ? (
        <>
          <Field label="기간"><select style={inputStyle}><option>전체</option><option>YTD</option><option>최근 1년</option><option>최근 3개월</option></select></Field>
          <Field label="형식"><div className="w-row" style={{ gap: 6 }}>{['CSV', 'XLSX', 'JSON'].map((f, i) => <span key={f} className="w-pill" style={{ background: i === 0 ? W.ink : W.bg, color: i === 0 ? '#fff' : W.muted, borderColor: i === 0 ? W.ink : W.hairline, cursor: 'pointer' }}>{f}</span>)}</div></Field>
        </>
      ) : (
        <>
          <Field label="파일" hint="증권사 거래내역서 또는 표준 양식 (날짜, 종목, 매수/매도, 수량, 단가, 통화, 수수료)">
            <div style={{ ...inputStyle, padding: 20, textAlign: 'center', border: `1px dashed ${W.line}` }}>📎 파일을 끌어다 놓거나 클릭</div>
          </Field>
          <Field label="브로커 양식 (선택)"><select style={inputStyle}><option>자동 감지</option><option>키움증권</option><option>토스증권</option><option>한국투자증권</option><option>Interactive Brokers</option></select></Field>
        </>
      )}
    </ModalShell>
  );
}

function FollowModal({ data, onClose }) {
  return (
    <ModalShell title={`★ ${data.name || '고수'} 팔로우`} onClose={onClose}
      footer={<>
        <button className="w-btn" onClick={onClose}>취소</button>
        <button className="w-btn-primary w-btn" onClick={() => { onClose(); toast('팔로우 완료'); }}>팔로우</button>
      </>}>
      <Field label="알림 받기">
        {['신규 13F 공시', '편입/편출 변경', '관심 종목과 겹치는 종목 매수'].map((l, i) => (
          <label key={l} className="w-row" style={{ gap: 8, padding: '3px 0', fontSize: 11.5, cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked={i < 2} /><span>{l}</span>
          </label>
        ))}
      </Field>
    </ModalShell>
  );
}

function BookmarkModal({ data, onClose }) {
  return (
    <ModalShell title={`★ ${data.title || '항목'} 북마크`} onClose={onClose}
      footer={<>
        <button className="w-btn" onClick={onClose}>취소</button>
        <button className="w-btn-primary w-btn" onClick={() => { onClose(); toast('북마크 추가됨'); }}>저장</button>
      </>}>
      <Field label="컬렉션"><select style={inputStyle}><option>기본 (북마크)</option><option>가치투자 자료</option><option>나중에 읽기</option><option>+ 새 컬렉션</option></select></Field>
      <Field label="메모 (선택)"><textarea style={{ ...inputStyle, minHeight: 60 }} placeholder="이 자료를 왜 저장하는지" /></Field>
    </ModalShell>
  );
}

function NoteModal({ data, onClose }) {
  return (
    <ModalShell title={`메모 — ${data.context || '항목'}`} onClose={onClose}
      footer={<>
        <button className="w-btn" onClick={onClose}>취소</button>
        <button className="w-btn-primary w-btn" onClick={() => { onClose(); toast('메모 저장됨'); }}>저장</button>
      </>}>
      <Field label="내 해석"><textarea style={{ ...inputStyle, minHeight: 140 }} placeholder="이 자료/뉴스/지표에 대한 내 생각을 적어두세요. 마이페이지 「내 메모/일지」에서 모아 볼 수 있습니다." /></Field>
      <Field label="태그 (선택)">
        <div className="w-row" style={{ gap: 4, flexWrap: 'wrap' }}>
          {['거시', '실적', '공시', '뉴스해석', '학습', 'Thesis 보강'].map(t => (
            <span key={t} className="w-pill" style={{ cursor: 'pointer', fontSize: 10 }}>{t}</span>
          ))}
        </div>
      </Field>
    </ModalShell>
  );
}

function ConfirmModal({ data, onClose }) {
  return (
    <ModalShell title={data.title || '확인'} onClose={onClose} width={380}
      footer={<>
        <button className="w-btn" onClick={onClose}>취소</button>
        <button className={data.danger ? 'w-btn-primary w-btn' : 'w-btn-primary w-btn'} onClick={() => { onClose(); toast(data.toast || '완료'); }} style={data.danger ? { background: W.down, borderColor: W.down } : {}}>{data.cta || '확인'}</button>
      </>}>
      <div style={{ fontSize: 12, lineHeight: 1.5 }}>{data.message || '계속 진행할까요?'}</div>
    </ModalShell>
  );
}

// ─── Host: subscribes to openModal + toast and renders ────────────────
function ModalHost() {
  const [modal, setModal] = React.useState(null);
  const [toasts, setToasts] = React.useState([]);
  React.useEffect(() => {
    const u1 = window._registerModalHost(({ type, data }) => setModal({ type, data }));
    const u2 = window._registerToastHost(({ msg, kind, id }) => {
      setToasts(t => [...t, { msg, kind, id }]);
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2400);
    });
    return () => { u1(); u2(); };
  }, []);
  const close = () => setModal(null);
  const Map = { trade: TradeModal, alert: AlertModal, thesis: ThesisModal, csv: CsvModal, follow: FollowModal, bookmark: BookmarkModal, note: NoteModal, confirm: ConfirmModal };
  const M = modal && Map[modal.type];
  return (
    <>
      {M && <M data={modal.data} onClose={close} />}
      {toasts.length > 0 && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', gap: 6, zIndex: 10000, pointerEvents: 'none' }}>
          {toasts.map(t => (
            <div key={t.id} className="w-card" style={{ padding: '8px 14px', fontSize: 11.5, background: W.ink, color: '#fff', borderColor: W.ink, boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>{t.msg}</div>
          ))}
        </div>
      )}
    </>
  );
}

window.ModalHost = ModalHost;
