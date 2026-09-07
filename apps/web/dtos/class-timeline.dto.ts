export type ClassTimelineKind = "session" | "class_survey" | "content_item";

export interface ClassTimelineItemDto {
  id: string;
  kind: ClassTimelineKind;
  sortOrder: number;
  title: string;
  kindLabel: string;
  occurredAt: string | null;
  sessionId: string | null;
  classSurveyId: string | null;
  classContentItemId: string | null;
  topicId: string | null;
  topicKind: "theory" | "practice" | null;
  isOpen: boolean | null;
  openAt: string | null;
  durationMinutes: number | null;
  hiddenAt: string | null;
  session: {
    id: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    lessonContent: string | null;
    homework: string | null;
    tutorial: string | null;
    recordingUrl: string | null;
    teacherName: string | null;
    myAttendanceStatus: string | null;
    myAttendanceNotes: string | null;
  } | null;
  survey: {
    id: string;
    reportDate: string;
    surveyName: string | null;
    startDate: string | null;
    endDate: string | null;
    notificationContent: string | null;
    notificationInstructions: string | null;
    notificationNotes: string | null;
    notificationTeacherNote: string | null;
  } | null;
}

export interface ClassTimelinePageDto {
  items: ClassTimelineItemDto[];
  nextCursor: string | null;
}
