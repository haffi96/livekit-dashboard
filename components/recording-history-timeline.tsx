"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { RecordingSession } from "@/lib/recording-session";

interface RecordingHistoryTimelineProps {
  sessions: RecordingSession[];
  activeSessionId?: string | null;
  windowHours?: number;
  nowTimestamp: number;
  onSelectTimestamp?: (timestampSecondsBehindLive: number) => void;
}

function formatAxisTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function formatRange(start: number, end: number): string {
  return `${formatAxisTime(start)} - ${formatAxisTime(end)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function RecordingHistoryTimeline({
  sessions,
  activeSessionId,
  windowHours = 12,
  nowTimestamp,
  onSelectTimestamp,
}: RecordingHistoryTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const windowMs = windowHours * 60 * 60 * 1000;
  const windowStart = nowTimestamp - windowMs;
  const tickCount = windowHours;

  if (sessions.length === 0) return null;

  const visibleSessions = sessions
    .map((session) => {
      const sessionEnd = session.endedAt ?? nowTimestamp;
      if (sessionEnd < windowStart || session.startedAt > nowTimestamp) {
        return null;
      }

      const visibleStart = Math.max(session.startedAt, windowStart);
      const visibleEnd = Math.min(sessionEnd, nowTimestamp);

      return {
        session,
        sessionEnd,
        visibleStart,
        visibleEnd,
        left: ((visibleStart - windowStart) / windowMs) * 100,
        width: ((visibleEnd - visibleStart) / windowMs) * 100,
      };
    })
    .filter(
      (
        session,
      ): session is {
        session: RecordingSession;
        sessionEnd: number;
        visibleStart: number;
        visibleEnd: number;
        left: number;
        width: number;
      } => session !== null,
    );

  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => {
    const ratio = index / tickCount;
    const timestamp = windowStart + ratio * windowMs;

    return {
      index,
      left: ratio * 100,
      timestamp,
      label: index === tickCount ? "Now" : formatAxisTime(timestamp),
      hideOnMobile: index > 0 && index < tickCount && index % 2 === 1,
    };
  });

  function handleSegmentClick(
    event: React.MouseEvent<HTMLButtonElement>,
    session: RecordingSession,
    sessionEnd: number,
  ) {
    if (!onSelectTimestamp || !trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const clickedTime = clamp(
      windowStart + ratio * windowMs,
      session.startedAt,
      sessionEnd,
    );

    onSelectTimestamp(Math.max(0, (nowTimestamp - clickedTime) / 1000));
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-neutral-100">
            Recording History
          </h3>
          <p className="text-xs text-neutral-400">
            Last {windowHours} hours, ending at now
          </p>
        </div>
        <span className="text-xs text-neutral-500">
          {visibleSessions.length} visible
        </span>
      </div>

      <div className="relative">
        <div ref={trackRef} className="relative h-10">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-neutral-700" />

          {ticks.map((tick) => (
            <div
              key={tick.index}
              className="absolute inset-y-0"
              style={{ left: `${tick.left}%` }}
            >
              <div
                className={cn(
                  "absolute top-1/2 h-6 w-px -translate-y-1/2 bg-neutral-800",
                  tick.index === tickCount && "bg-neutral-400/70",
                )}
              />
            </div>
          ))}

          <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-neutral-800" />

          {visibleSessions.map(({ session, sessionEnd, left, width }) => {
            const isActive = session.sessionId === activeSessionId;

            return (
              <button
                key={session.sessionId}
                type="button"
                onClick={(event) =>
                  handleSegmentClick(event, session, sessionEnd)
                }
                className={cn(
                  "absolute top-1/2 h-3 -translate-y-1/2 rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80",
                  isActive
                    ? "bg-sky-400 shadow-[0_0_0_1px_rgba(125,211,252,0.65),0_0_16px_rgba(14,165,233,0.35)]"
                    : "bg-sky-500/85 hover:bg-sky-400",
                )}
                style={{
                  left: `${left}%`,
                  width: `${Math.max(width, 0.25)}%`,
                  minWidth: "2px",
                }}
                title={formatRange(session.startedAt, sessionEnd)}
              />
            );
          })}
        </div>

        <div className="relative mt-2 h-5 text-[10px] text-neutral-500">
          {ticks.map((tick) => (
            <span
              key={tick.index}
              className={cn(
                "absolute -translate-x-1/2 whitespace-nowrap",
                tick.hideOnMobile && "hidden sm:block",
                tick.index === 0 && "translate-x-0 text-left",
                tick.index === tickCount && "-translate-x-full text-right",
              )}
              style={{ left: `${tick.left}%` }}
            >
              {tick.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
