import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ActionIntent, DetailContent } from "./action-intent";

const NOTICE_MS = 2600;

export function useInteractionActions() {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<DetailContent | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function handleAction(intent: ActionIntent) {
    if (intent.type === "route") {
      navigate(intent.to);
      return;
    }
    if (intent.type === "detail") {
      setDetail(intent.detail);
      return;
    }
    if (intent.type === "external") {
      window.open(intent.href, "_blank", "noopener,noreferrer");
      return;
    }
    setNotice(intent.message);
  }

  return {
    detail,
    notice,
    closeDetail: () => setDetail(null),
    handleAction,
  };
}
