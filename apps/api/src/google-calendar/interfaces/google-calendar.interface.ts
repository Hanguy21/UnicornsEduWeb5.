export interface GoogleCalendarEventAttendee {
  email: string;
  displayName?: string;
  role?: 'CO_HOST' | 'ATTENDEE';
}

export interface GoogleCalendarEventData {
  summary: string;
  description?: string;
  startDateTime: Date;
  endDateTime: Date;
  timeZone?: string;
  attendees?: GoogleCalendarEventAttendee[];
}

export interface CreateCalendarEventResult {
  eventId: string;
  meetLink: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
  }>;
  conferenceData?: {
    entryPoints: Array<{
      entryPointType: string;
      uri: string;
    }>;
  };
  htmlLink: string;
}

export interface GoogleCalendarConfig {
  serviceAccountKeyBase64?: string;
  serviceAccountJsonPath?: string;
  calendarId?: string;
  timeZone?: string;
}
