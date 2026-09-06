"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StudentAttemptTimer({
  endsAt,
  onExpire,
}: {
  remainingMs?: number;
  endsAt: string;
  onExpire?: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  const left = Math.max(0, new Date(endsAt).getTime() - now);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (left > 0 || expiredRef.current) return;
    expiredRef.current = true;
    onExpireRef.current?.();
  }, [left]);

  const totalSec = Math.ceil(left / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  const urgent = totalSec <= 60;

  return (
    <div
      className={cn(
        "sticky top-0 z-20 -mx-1 mb-4 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-sm",
        urgent
          ? "border-error/40 bg-error/10 text-error"
          : "border-border-default bg-bg-surface text-text-primary",
      )}
      role="timer"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-2 text-sm font-semibold">
        <Clock className="size-4" />
        Thời gian còn lại
      </span>
      <span className="font-mono text-lg font-bold tabular-nums">
        {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
      </span>
    </div>
  );
}
