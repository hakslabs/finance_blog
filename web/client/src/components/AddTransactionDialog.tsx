/**
 * Reusable add-trade dialog.
 *
 * Used by Portfolio page ("종목 추가" button) and MyPage Trades tab.
 * Optimistically appends to the local state via onCreated callback; the
 * caller is responsible for refetching/sync with portfolio backend.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { portfolioService } from "@/features/portfolio";
import { useAuth } from "@/contexts/AuthContext";
import type { Trade } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTicker?: string;
  initialName?: string;
  onCreated?: (trade: Trade) => void;
}

export function AddTransactionDialog({ open, onOpenChange, initialTicker, initialName, onCreated }: Props) {
  const { user } = useAuth();
  const [type, setType] = useState<"buy" | "sell">("buy");
  const [ticker, setTicker] = useState(initialTicker ?? "");
  const [name, setName] = useState(initialName ?? "");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!ticker || !quantity || !price) {
      toast.error("필수 항목을 입력해주세요");
      return;
    }
    const trade: Omit<Trade, "id"> = {
      ticker: ticker.toUpperCase(),
      name: name || ticker.toUpperCase(),
      type,
      quantity: Number(quantity),
      price: Number(price),
      date,
      note: note || undefined,
    };
    setSubmitting(true);
    try {
      if (user) {
        const saved = await portfolioService.addTrade(trade);
        toast.success(`${type === "buy" ? "매수" : "매도"} 거래 추가됨`);
        onCreated?.(saved);
      } else {
        // anonymous: synth id + local-only
        const synth: Trade = { ...trade, id: `local_${Date.now()}` };
        toast.success("거래 추가됨 (로그인 시 동기화)");
        onCreated?.(synth);
      }
      onOpenChange(false);
      setTicker(initialTicker ?? ""); setName(initialName ?? "");
      setQuantity(""); setPrice(""); setNote("");
    } catch (e: any) {
      toast.error(`저장 실패: ${e?.message ?? "unknown"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>거래 추가</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">거래유형</Label>
              <Select value={type} onValueChange={(v) => setType(v as "buy" | "sell")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">매수</SelectItem>
                  <SelectItem value="sell">매도</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">날짜</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">티커</Label>
            <Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="AAPL, 005930" />
          </div>
          <div>
            <Label className="text-xs">종목명</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Apple Inc., 삼성전자" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">수량</Label>
              <Input type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">가격</Label>
              <Input type="number" min="0" step="any" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">메모 (선택)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>취소</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? "저장 중…" : "저장"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
