import { useEffect, useMemo, useState } from "react";

export type MarketCode = "KR" | "US";

type MarketSession = {
  code: MarketCode;
  label: string;
  open: boolean;
  statusLabel: string;
};

const MINUTE_MS = 60_000;

function partsInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    weekday: get("weekday"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

function isWeekday(weekday: string) {
  return weekday !== "Sat" && weekday !== "Sun";
}

function isKrxOpen(date: Date) {
  const kst = partsInZone(date, "Asia/Seoul");
  const minutes = kst.hour * 60 + kst.minute;
  return isWeekday(kst.weekday) && minutes >= 9 * 60 && minutes <= 15 * 60 + 30;
}

function isNyseOpen(date: Date) {
  const ny = partsInZone(date, "America/New_York");
  const minutes = ny.hour * 60 + ny.minute;
  return isWeekday(ny.weekday) && minutes >= 9 * 60 + 30 && minutes <= 16 * 60;
}

function greetingFor(date: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      hour12: false,
    }).format(date)
  );

  if (hour >= 5 && hour < 11) return "좋은 아침입니다";
  if (hour >= 11 && hour < 17) return "좋은 오후입니다";
  if (hour >= 17 && hour < 22) return "좋은 저녁입니다";
  return "늦은 시간입니다";
}

function formatKoreanDashboardTime(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function buildSessions(date: Date): MarketSession[] {
  const krOpen = isKrxOpen(date);
  const usOpen = isNyseOpen(date);
  return [
    {
      code: "KR",
      label: "한국장",
      open: krOpen,
      statusLabel: krOpen ? "KRX 개장 중" : "KRX 장외",
    },
    {
      code: "US",
      label: "미국장",
      open: usOpen,
      statusLabel: usOpen ? "NYSE 개장 중" : "NYSE 장외",
    },
  ];
}

export function useDashboardClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), MINUTE_MS);
    return () => window.clearInterval(timer);
  }, []);

  return useMemo(() => {
    const sessions = buildSessions(now);
    const primaryMarket = sessions.find((session) => session.open)?.code ?? "KR";
    return {
      greeting: greetingFor(now),
      currentTimeLabel: formatKoreanDashboardTime(now),
      sessions,
      primaryMarket,
    };
  }, [now]);
}
