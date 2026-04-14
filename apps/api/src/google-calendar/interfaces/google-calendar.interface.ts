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
  recurrence?: string[];
  htmlLink: string;
}

export interface GoogleCalendarConfig {
  serviceAccountKeyBase64?: string;
  serviceAccountJsonPath?: string;
  calendarId?: string;
  timeZone?: string;
  // OAuth2 user credentials (preferred for Google Meet support)
  googleClientId?: string;
  googleClientSecret?: string;
  googleRefreshToken?: string;
}
