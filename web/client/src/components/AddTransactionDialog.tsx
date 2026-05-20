/**
 * 포트폴리오 매수/매도 기록 모달.
 * 인증된 사용자: 서버(transactions 테이블)에 저장. 비로그인: 호출하지 않음(상위에서 가드).
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { portfolioTransactionsService, type TxType } from "@/features/portfolio-transactions";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  defaultSymbol?: string;
}

export function AddTransactionDialog({ open, onOpenChange, onCreated, defaultSymbol }: Props) {
  const [type, setType] = useState<TxType>("buy");
  const [symbol, setSymbol] = useState(defaultSymbol ?? "");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setType("buy");
    setSymbol(defaultSymbol ?? "");
    setQuantity("");
    setPrice("");
    setOccurredAt(new Date().toISOString().slice(0, 10));
    setNote("");
  };

  const onSubmit = async () => {
    if (!symbol.trim()) { toast.error("종목을 입력하세요"); return; }
    const qty = Number(quantity);
    const px = Number(price);
    if (!Number.isFinite(qty) || qty <= 0) { toast.error("수량이 유효하지 않습니다"); return; }
    if (!Number.isFinite(px) || px < 0) { toast.error("가격이 유효하지 않습니다"); return; }

    setSubmitting(true);
    try {
      await portfolioTransactionsService.create({
        symbol: symbol.trim().toUpperCase(),
        type,
        quantity: qty,
        price: px,
        occurred_at: occurredAt,
        note: note.trim() || undefined,
      });
      toast.success("거래가 기록되었습니다");
      onOpenChange(false);
      reset();
      onCreated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "거래 기록 실패";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>거래 기록</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex gap-2">
            <Button variant={type === "buy" ? "default" : "outline"} size="sm" onClick={() => setType("buy")}>매수</Button>
            <Button variant={type === "sell" ? "default" : "outline"} size="sm" onClick={() => setType("sell")}>매도</Button>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">종목 (심볼)</label>
            <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="예: AAPL, 005930" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">수량</label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">단가</label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">거래일</label>
            <Input type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">메모 (선택)</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="투자 근거, 진입 이유 등" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>취소</Button>
          <Button onClick={onSubmit} disabled={submitting}>{submitting ? "저장 중..." : "저장"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
