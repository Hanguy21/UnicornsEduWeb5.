"use client";

import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventClickArg, EventContentArg } from "@fullcalendar/core";
import { ClassScheduleEvent } from "@/dtos/class-schedule.dto";
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

const formatTeacherLabel = (teacherNames: string[]) => {
  if (teacherNames.length === 0) return "Chưa gán giáo viên";
  if (teacherNames.length === 1) return teacherNames[0];
  return `${teacherNames[0]} +${teacherNames.length - 1}`;
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
      events.map((event) => ({
        id: event.occurrenceId,
        title: event.className,
        start: `${event.date}T${event.startTime ?? "00:00:00"}`,
        end: `${event.date}T${event.endTime ?? event.startTime ?? "00:00:00"}`,
        extendedProps: {
          occurrenceId: event.occurrenceId,
          classId: event.classId,
          teacherIds: event.teacherIds,
          teacherNames: event.teacherNames,
          teacherLabel: formatTeacherLabel(event.teacherNames),
          meetLink: event.meetLink,
          calendarEventId: event.calendarEventId,
          patternEntryId: event.patternEntryId,
          startTime: event.startTime,
          endTime: event.endTime,
        },
        classNames: [event.meetLink ? "is-synced" : "is-unsynced"],
      })),
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

    return {
      slotMinTime: minutesToSlotTime(Math.floor((Math.max(minMinutes - 60, 0)) / 60) * 60),
      slotMaxTime: minutesToSlotTime(
        Math.ceil(Math.min(maxMinutes + 60, 24 * 60) / 60) * 60,
      ),
    };
  }, [events]);

  const renderEventContent = (eventInfo: EventContentArg) => {
    const { event } = eventInfo;
    const { teacherLabel, meetLink } = event.extendedProps as {
      teacherLabel?: string;
      meetLink?: string;
    };

    return (
      <div className="flex min-h-full flex-col gap-1">
        <div className="flex items-center gap-1">
          {meetLink && (
            <svg
              className="size-3 shrink-0"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path d="M21.478 9.54a.996.996 0 00-.997-.997A18.87 18.87 0 0012 2.81a18.87 18.87 0 00-8.481 3.743.996.996 0 00-.997.997A29.85 29.85 0 001.78 12c0 5.685 4.28 10.374 9.888 11.2A29.85 29.85 0 0012 21.22c5.685 0 10.374-4.277 11.198-9.878.996-.997.996-2.478.002-3.476zM10 16V8l6 4-6 4z" />
            </svg>
          )}
          <span className="truncate text-[11px] font-semibold">{eventInfo.timeText}</span>
        </div>
        <span className="truncate text-xs font-semibold">{event.title}</span>
        {teacherLabel && (
          <span className="block truncate text-[11px] opacity-80">
            {teacherLabel}
          </span>
        )}
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
      meetLink?: string;
      calendarEventId?: string;
      patternEntryId?: string;
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
      meetLink: extendedProps.meetLink,
      calendarEventId: extendedProps.calendarEventId,
      patternEntryId: extendedProps.patternEntryId,
    };

    onEventClick(classScheduleEvent);
  };

  return (
    <div className={`${styles.calendarShell} rounded-xl border border-border-default bg-bg-surface p-2 text-sm shadow-sm sm:p-4`}>
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
        eventMinHeight={52}
        eventShortHeight={40}
        slotEventOverlap={true}
        expandRows={true}
        dayHeaderClassNames={["ue-day-header"]}
        viewClassNames={["ue-week-view"]}
      />
    </div>
  );
}
