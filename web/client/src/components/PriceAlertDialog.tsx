/**
 * Reusable price-alert creation dialog.
 *
 * Used by StockDetail "알림" button and MyPage Alerts tab.
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { alertsService, type Alert } from "@/features/alerts";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  symbol?: string;
  currentPrice?: number;
  onCreated?: (alert: Alert) => void;
}

const TYPE_LABEL: Record<Alert["alert_type"], string> = {
  target: "목표가 도달",
  stoploss: "손절가 도달",
  volume: "거래량 급증",
  news: "관련 뉴스",
  earnings: "실적 발표",
};

export function PriceAlertDialog({
  open,
  onOpenChange,
  symbol = "",
  currentPrice,
  onCreated,
}: Props) {
  const { user } = useAuth();
  const [ticker, setTicker] = useState(symbol);
  const [alertType, setAlertType] = useState<Alert["alert_type"]>("target");
  const [target, setTarget] = useState(
    currentPrice ? String(currentPrice) : "",
  );
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!ticker || !target) {
      toast.error("티커와 목표값을 입력해주세요");
      return;
    }
    if (!user) {
      toast.error("로그인이 필요합니다");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        symbol: ticker.toUpperCase(),
        alert_type: alertType,
        condition: `${TYPE_LABEL[alertType]} @ ${target}`,
        target_value: Number(target),
        current_value: currentPrice,
        is_active: true,
      };
      const saved = await alertsService.create(body);
      toast.success("알림이 설정되었습니다");
      onCreated?.(saved);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(`저장 실패: ${e?.message ?? "unknown"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>가격 알림 설정</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">티커</Label>
            <Input
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              disabled={!!symbol}
            />
          </div>
          <div>
            <Label className="text-xs">알림 종류</Label>
            <Select
              value={alertType}
              onValueChange={(v) => setAlertType(v as Alert["alert_type"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">
              목표값 {currentPrice ? `(현재 ${currentPrice})` : ""}
            </Label>
            <Input
              type="number"
              step="any"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            취소
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "저장 중…" : "알림 설정"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
