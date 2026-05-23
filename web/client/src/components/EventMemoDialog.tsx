/**
 * Calendar event memo dialog.
 *
 * Lets the user attach a note to a CalendarEvent (target_kind=calendar_event,
 * target_ref=event.id). Loads any existing memo for this event/user on open.
 */
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { memosService, type Memo } from "@/features/memos";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle?: string;
}

export function EventMemoDialog({
  open,
  onOpenChange,
  eventId,
  eventTitle,
}: Props) {
  const { user } = useAuth();
  const [existing, setExisting] = useState<Memo | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !user) {
      setExisting(null);
      setBody("");
      return;
    }
    let cancelled = false;
    memosService
      .list({ target_kind: "calendar_event", target_ref: eventId, limit: 1 })
      .then((r) => {
        if (cancelled) return;
        const m = r.items[0] ?? null;
        setExisting(m);
        setBody(m?.body ?? "");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, user, eventId]);

  const save = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return;
    }
    if (!body.trim()) {
      toast.error("내용을 입력해주세요");
      return;
    }
    setBusy(true);
    try {
      if (existing) {
        await memosService.update(existing.id, { body });
      } else {
        await memosService.create({
          target_kind: "calendar_event",
          target_ref: eventId,
          title: eventTitle,
          body,
        });
      }
      toast.success("메모 저장됨");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(`저장 실패: ${e?.message ?? "unknown"}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!existing || !user) return;
    setBusy(true);
    try {
      await memosService.remove(existing.id);
      toast.success("메모 삭제됨");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(`삭제 실패: ${e?.message ?? "unknown"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{eventTitle ?? "이벤트"} 메모</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Textarea
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="이 이벤트에 대한 메모를 남겨두세요…"
          />
        </div>
        <DialogFooter className="gap-2">
          {existing && (
            <Button
              variant="outline"
              onClick={remove}
              disabled={busy}
              className="mr-auto text-down"
            >
              삭제
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            취소
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "저장 중…" : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
