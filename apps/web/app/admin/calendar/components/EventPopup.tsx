"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClassScheduleEvent } from "@/dtos/class-schedule.dto";
import * as classScheduleApi from "@/lib/apis/class-schedule.api";

interface EventPopupProps {
  event: ClassScheduleEvent;
  onClose: () => void;
}

/**
 * EventPopup component displays class details when a calendar event is clicked
 * Shows class name, teacher, time, and provides Meet link and Google Calendar sync
 */
export default function EventPopup({ event, onClose }: EventPopupProps) {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const teacherLabel =
    event.teacherNames.length > 0 ? event.teacherNames.join(", ") : "Chưa gán giáo viên";

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () => classScheduleApi.syncClassSchedule(event.classId),
    onMutate: () => setIsSyncing(true),
    onSuccess: () => {
      toast.success("Đã đồng bộ lịch lên Google Calendar");
      // Invalidate class schedule events to refetch with new calendarEventIds
      queryClient.invalidateQueries({ queryKey: ["classScheduleEvents"] });
      setIsSyncing(false);
      onClose();
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        "Không thể đồng bộ lịch.";
      toast.error(message);
      setIsSyncing(false);
    },
  });

  const handleSync = async () => {
    try {
      await syncMutation.mutateAsync();
    } catch {
      // Error handled in onError
    }
  };

  const handleJoinMeet = () => {
    if (event.meetLink) {
      window.open(event.meetLink, "_blank", "noopener,noreferrer");
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return "—";
    // Format HH:mm:ss to HH:mm
    return time.slice(0, 5);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Popup Content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-popup-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-border-default bg-bg-surface p-5 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3
              id="event-popup-title"
              className="text-lg font-semibold text-text-primary line-clamp-2"
            >
              {event.className}
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              Giáo viên: {teacherLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-2 flex size-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus"
            aria-label="Đóng"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Event Details */}
        <div className="mt-4 space-y-3">
          {/* Date & Time */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-border-default bg-bg-secondary p-3">
              <p className="text-xs font-medium uppercase text-text-muted">Ngày</p>
              <p className="mt-1 text-sm text-text-primary">{formatDate(event.date)}</p>
            </div>
            <div className="rounded-lg border border-border-default bg-bg-secondary p-3">
              <p className="text-xs font-medium uppercase text-text-muted">Thời gian</p>
              <p className="mt-1 text-sm text-text-primary">
                {formatTime(event.startTime)} - {formatTime(event.endTime)}
              </p>
            </div>
          </div>

          {/* Google Calendar Sync Info */}
          {event.calendarEventId && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-medium uppercase text-primary">Đã đồng bộ Google Calendar</p>
            </div>
          )}

          {/* Meet Link */}
          {event.meetLink && (
            <div className="rounded-lg border border-border-default bg-bg-secondary p-3">
              <p className="text-xs font-medium uppercase text-text-muted">Google Meet Link</p>
              <a
                href={event.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block text-sm text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {event.meetLink}
              </a>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleJoinMeet}
            disabled={!event.meetLink}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition-opacity hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Tham gia Meet
          </button>
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-opacity hover:bg-bg-secondary focus:outline-none focus:ring-2 focus:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            {isSyncing ? (
              <>
                <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Đang đồng bộ...
              </>
            ) : (
              <>
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Đồng bộ lên Google Calendar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
