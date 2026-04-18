"use client";

import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  EventClickArg,
  EventContentArg,
  EventMountArg,
} from "@fullcalendar/core";
import { ClassScheduleEvent } from "@/dtos/class-schedule.dto";
import {
  CalendarEventPalette,
  getClassEventPalette,
} from "./calendar-event-palette";
import styles from "./CalendarView.module.css";

interface CalendarViewProps {
  events: ClassScheduleEvent[];
  weekStart: Date;
  weekEnd: Date;
  onEventClick: (event: ClassScheduleEvent) => void;
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const parseTimeToMinutes = (value?: string) => {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
};

const minutesToSlotTime = (minutes: number) => {
  const clamped = Math.max(0, Math.min(minutes, 24 * 60));
  const hours = Math.floor(clamped / 60);
  const remainingMinutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}:00`;
};

/**
 * CalendarView component using FullCalendar
 * Displays the current week in a fixed Google Calendar-like time grid
 */
export default function CalendarView({
  events,
  weekStart,
  weekEnd,
  onEventClick,
}: CalendarViewProps) {
  const calendarEvents = useMemo(
    () =>
      events.map((event) => {
        const palette = getClassEventPalette(event.classId);

        return {
          id: event.occurrenceId,
          title: event.className,
          start: `${event.date}T${event.startTime ?? "00:00:00"}`,
          end: `${event.date}T${event.endTime ?? event.startTime ?? "00:00:00"}`,
          backgroundColor: palette.start,
          borderColor: palette.ring,
          textColor: palette.text,
          extendedProps: {
            occurrenceId: event.occurrenceId,
            classId: event.classId,
            teacherIds: event.teacherIds,
            teacherNames: event.teacherNames,
            patternEntryId: event.patternEntryId,
            startTime: event.startTime,
            endTime: event.endTime,
            meetLink: event.meetLink,
            palette,
          },
        };
      }),
    [events],
  );

  const slotRange = useMemo(() => {
    const defaultRange = {
      slotMinTime: "06:00:00",
      slotMaxTime: "22:00:00",
    };

    if (events.length === 0) {
      return defaultRange;
    }

    const startTimes = events
      .map((event) => parseTimeToMinutes(event.startTime))
      .filter((value): value is number => value !== null);
    const endTimes = events
      .map((event) => parseTimeToMinutes(event.endTime))
      .filter((value): value is number => value !== null);

    if (startTimes.length === 0 || endTimes.length === 0) {
      return defaultRange;
    }

    const minMinutes = Math.min(...startTimes);
    const maxMinutes = Math.max(...endTimes);

    const padBefore = 45;
    const padAfter = 45;
    const dayStart = 6 * 60;
    const dayEnd = 22 * 60;

    let minSlot = Math.floor((Math.max(minMinutes - padBefore, 0)) / 60) * 60;
    let maxSlot = Math.ceil(Math.min(maxMinutes + padAfter, 24 * 60) / 60) * 60;

    // Bỏ dải nửa đêm–sáng trống khi mọi buổi đều từ 6h trở đi
    if (minMinutes >= dayStart) {
      minSlot = Math.max(minSlot, dayStart);
    }
    // Không kéo lưới quá 22:00 khi buổi học kết thúc không muộn hơn 22:00
    if (maxMinutes <= dayEnd) {
      maxSlot = Math.min(maxSlot, dayEnd);
    }

    minSlot = Math.max(0, minSlot);
    maxSlot = Math.min(24 * 60, maxSlot);

    if (maxSlot <= minSlot) {
      return defaultRange;
    }

    return {
      slotMinTime: minutesToSlotTime(minSlot),
      slotMaxTime: minutesToSlotTime(maxSlot),
    };
  }, [events]);

  const renderEventContent = (eventInfo: EventContentArg) => {
    const { event } = eventInfo;

    return (
      <div className="flex min-h-full flex-col gap-1">
        <span className="truncate text-[11px] font-semibold">{eventInfo.timeText}</span>
        <span className="truncate text-xs font-semibold">{event.title}</span>
      </div>
    );
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const extendedProps = clickInfo.event.extendedProps as {
      occurrenceId: string;
      classId: string;
      teacherIds: string[];
      teacherNames: string[];
      startTime?: string;
      endTime?: string;
      patternEntryId?: string;
      meetLink?: string;
    };

    // Build our ClassScheduleEvent DTO
    const classScheduleEvent: ClassScheduleEvent = {
      occurrenceId: extendedProps.occurrenceId,
      classId: extendedProps.classId,
      teacherIds: extendedProps.teacherIds,
      className: clickInfo.event.title,
      teacherNames: extendedProps.teacherNames,
      date: clickInfo.event.start
        ? [
            clickInfo.event.start.getFullYear(),
            String(clickInfo.event.start.getMonth() + 1).padStart(2, "0"),
            String(clickInfo.event.start.getDate()).padStart(2, "0"),
          ].join("-")
        : "",
      startTime: extendedProps.startTime,
      endTime: extendedProps.endTime,
      patternEntryId: extendedProps.patternEntryId,
      meetLink: extendedProps.meetLink,
    };

    onEventClick(classScheduleEvent);
  };

  const handleEventDidMount = (mountInfo: EventMountArg) => {
    const { palette } = mountInfo.event.extendedProps as {
      palette?: CalendarEventPalette;
    };

    if (!palette) {
      return;
    }

    mountInfo.el.style.setProperty("--ue-calendar-event-start", palette.start);
    mountInfo.el.style.setProperty("--ue-calendar-event-end", palette.end);
    mountInfo.el.style.setProperty("--ue-calendar-event-text", palette.text);
    mountInfo.el.style.setProperty("--ue-calendar-event-shadow", palette.shadow);
    mountInfo.el.style.setProperty("--ue-calendar-event-ring", palette.ring);
    mountInfo.el.style.setProperty("--ue-calendar-event-accent", palette.accent);
  };

  return (
    <div className={`${styles.calendarShell} rounded-xl border border-border-default bg-bg-surface p-1.5 text-sm shadow-sm sm:p-2.5`}>
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5 sm:hidden">
        <div>
          <p className="text-xs font-semibold text-text-primary">Lịch tuần</p>
          <p className="text-[11px] text-text-muted">Vuốt ngang để xem 7 ngày.</p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-border-default bg-bg-secondary px-2.5 py-1 text-[11px] font-medium text-text-secondary">
          <svg
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            />
          </svg>
          Scroll
        </div>
      </div>

      <div className="overflow-x-auto overscroll-x-contain pb-1">
        <div className={styles.calendarScroller}>
          <FullCalendar
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            initialDate={weekStart}
            headerToolbar={false}
            visibleRange={{
              start: weekStart,
              end: addDays(weekEnd, 1),
            }}
            height="auto"
            events={calendarEvents}
            eventClick={handleEventClick}
            eventDidMount={handleEventDidMount}
            eventContent={renderEventContent}
            editable={false}
            selectable={false}
            navLinks={false}
            nowIndicator={true}
            businessHours={false}
            stickyHeaderDates="auto"
            firstDay={0}
            locale="vi"
            weekends={true}
            weekNumbers={false}
            allDaySlot={false}
            noEventsText="Không có sự kiện nào"
            dayHeaderFormat={{
              weekday: "short",
              day: "2-digit",
              month: "2-digit",
            }}
            eventTimeFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }}
            slotLabelFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }}
            displayEventTime={false}
            displayEventEnd={false}
            slotMinTime={slotRange.slotMinTime}
            slotMaxTime={slotRange.slotMaxTime}
            slotDuration="00:30:00"
            slotLabelInterval="01:00:00"
            slotEventOverlap={false}
            expandRows={true}
            dayHeaderClassNames={["ue-day-header"]}
            viewClassNames={["ue-week-view"]}
          />
        </div>
      </div>
    </div>
  );
}
