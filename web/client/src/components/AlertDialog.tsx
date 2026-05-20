/**
 * 가격 알림 등록 모달 — StockDetail에서 호출.
 * 현재는 가격(price) 알림만 지원. 향후 RSI/MA-cross 등 확장.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { alertsService } from "@/features/alerts";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  symbol: string;
  lastPrice: number;
}

export function PriceAlertDialog({ open, onOpenChange, symbol, lastPrice }: Props) {
  const [operator, setOperator] = useState<"gte" | "lte">("gte");
  const [threshold, setThreshold] = useState<string>(lastPrice ? lastPrice.toFixed(2) : "");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    const value = Number(threshold);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("유효한 가격을 입력하세요");
      return;
    }
    setSubmitting(true);
    try {
      await alertsService.create({
        symbol,
        kind: "price",
        operator,
        threshold: value,
        enabled: true,
      });
      toast.success("알림이 등록되었습니다");
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "알림 등록 실패";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>가격 알림 등록 · {symbol}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="text-sm text-muted-foreground">현재가 {lastPrice.toLocaleString()}</div>
          <div className="flex gap-2">
            <Button
              variant={operator === "gte" ? "default" : "outline"}
              size="sm"
              onClick={() => setOperator("gte")}
            >
              이상일 때
            </Button>
            <Button
              variant={operator === "lte" ? "default" : "outline"}
              size="sm"
              onClick={() => setOperator("lte")}
            >
              이하일 때
            </Button>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">기준 가격</label>
            <Input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="예: 100.00"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>취소</Button>
          <Button onClick={onSubmit} disabled={submitting}>등록</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
