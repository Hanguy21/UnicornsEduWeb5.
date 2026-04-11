# Calendar Admin API Implementation Plan

> Historical implementation note: the module now exists in `apps/api/src/calendar/`. Runtime business routes are `/admin/calendar/...` and `/calendar/...` on the backend host; Swagger remains mounted at `/api`. The newer class-pattern endpoints are documented in `docs/pages/google-calendar.md`.

## Diagnosis

The calendar page at `/admin/calendar` fails with **"Cannot GET /admin/calendar/events"** because the backend lacks the required calendar admin API endpoints.

**Frontend expectations** (from `apps/web/lib/apis/google-calendar.api.ts`):
- `GET /api/calendar/admin/events` (with startDate/endDate filters)
- `GET /api/calendar/classes`
- `GET /api/calendar/teachers`
- `GET /api/calendar/events/:id`
- `PUT /api/calendar/events/:id`
- `DELETE /api/calendar/events/:id`
- `POST /api/calendar/events/:id/sync`
- `POST /api/calendar/events/bulk-sync`
- `GET /api/calendar/sync/status`

In a typical Next.js + NestJS monorepo, requests to `/api/*` are forwarded by Next.js rewrites or a proxy to the NestJS backend **with the `/api` prefix stripped**. The backend therefore receives requests at **root-level routes** like:
- `/calendar/admin/events`
- `/calendar/classes`
- `/calendar/teachers`
- `/calendar/events/:id`
- etc.

The NestJS application currently has no routes matching these paths → 404.

**Root cause**: The `CalendarModule` with its controllers does not exist yet in the backend.

---

## Solution

Implement a new `CalendarModule` with three controllers covering admin and public calendar endpoints.

---

## File Structure

```
apps/api/src/calendar/
├── calendar.module.ts
├── calendar.service.ts
├── calendar-admin.controller.ts
├── calendar.controller.ts
└── calendar-events.controller.ts
```

---

## Detailed Implementation

### 1. CalendarService (`calendar.service.ts`)

Primary business logic for calendar data.

**Key methods:**

| Method | Purpose |
|--------|---------|
| `getAdminEvents(filters: CalendarEventFilters): Promise<CalendarEventResponseDto>` | Query `Session` via Prisma, join `class` & `teacher`, apply date/class/teacher filters, return formatted `CalendarEvent[]` |
| `getEventBySessionId(sessionId: string): Promise<CalendarEvent \| null>` | Get single event by session ID |
| `updateSessionAndSync(sessionId, updates): Promise<CalendarEvent>` | Update session in DB then call `GoogleCalendarService.resyncSessionCalendar` |
| `deleteSessionAndCalendar(sessionId): Promise<void>` | Delete from Google Calendar (if linked) then delete session |
| `syncEvent(sessionId): Promise<ResyncResponseDto>` | Manual resync for one session |
| `bulkSync(sessionIds): Promise<ResyncResponseDto[]>` | Concurrent bulk sync |
| `getClasses(page, limit): Promise<Class[]>` | Paginated class list (for filter dropdown) |
| `getTeachers(page, limit): Promise<Staff[]>` | Paginated teacher list (for filter dropdown) |

### 2. CalendarAdminController (`calendar-admin.controller.ts`)

- **Route**: `@Controller('calendar/admin')`
- **Guard**: `@Roles(UserRole.admin)`
- **Endpoints**:
  - `@Get('events')` → list with filters
  - `@Get('events/:sessionId')` → single event
  - `@Put('events/:sessionId')` → update + sync
  - `@Delete('events/:sessionId')` → delete + cleanup
  - `@Post('events/:sessionId/sync')` → manual sync

### 3. CalendarEventsController (`calendar-events.controller.ts`)

- **Route**: `@Controller('calendar/events')`
- **Guard**: `@Roles(UserRole.admin)`
- **Endpoints**:
  - `@Get(':sessionId')`
  - `@Put(':sessionId')`
  - `@Delete(':sessionId')`
  - `@Post(':sessionId/sync')`
  - `@Post('bulk-sync')`

### 4. CalendarController (`calendar.controller.ts`)

- **Route**: `@Controller('calendar')`
- **Guard**: `@Roles(UserRole.admin, UserRole.staff)`
- **Endpoints**:
  - `@Get('classes')` → class list
  - `@Get('teachers')` → teacher list
  - `@Get('sync/status')` → status check

### 5. CalendarModule (`calendar.module.ts`)

```ts
@Module({
  imports: [PrismaModule, GoogleCalendarModule],
  controllers: [CalendarAdminController, CalendarController, CalendarEventsController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
```

### 6. AppModule Integration

In `apps/api/src/app.module.ts`:
- Add `import { CalendarModule } from './calendar/calendar.module';`
- Add `CalendarModule` to the `imports` array.

### 7. DTOs

Reuse existing DTOs from `apps/api/src/dtos/google-calendar.dto.ts`:
- `CalendarEventFilters` (with `startDate`, `endDate`, `classId`, `teacherId`, `status`)
- `CalendarEventResponseDto` (`{ success: boolean; data: CalendarEvent[] }`)
- `ResyncResponseDto` (`{ success: boolean; message: string; syncedAt?: string }`)

### 8. Authorization

- Admin routes: `@Roles(UserRole.admin)`
- Supporting routes: `@Roles(UserRole.admin, UserRole.staff)`

---

## Verification Steps

1. **Start backend** (pnpm --filter api start) — ensure watch mode picks up new files.
2. **Manual API tests**:
   ```bash
   curl "http://localhost:3001/calendar/admin/events?startDate=2026-04-11&endDate=2026-05-11"
   curl "http://localhost:3001/calendar/classes"
   curl "http://localhost:3001/calendar/teachers"
   ```
3. **Frontend test**:
   - Open `/admin/calendar` in browser
   - Confirm calendar loads without network errors
   - Test filter dropdowns populate
   - Click an event → popup shows "Sync" button and works
4. **Swagger UI**: Visit `/api-docs` → see new "Calendar" and "Calendar Admin" tags
5. **Regression**: Ensure existing session pages still work

---

## Estimated Scope

- **~5 new files** (module, service, 3 controllers)
- **~300 lines** of code across files
- Reuses `GoogleCalendarService` for sync operations
- Leverages existing Prisma schema fields (`googleCalendarEventId`, `googleMeetLink`)
- **No database schema changes** required

---

## Notes

- All routes are **root-level** (no `/api` prefix) because Next.js proxy strips `/api` before forwarding.
- Ensure `CalendarEventFilters` validation is active via global `ValidationPipe` (already configured in `main.ts`).
- If pagination is needed for classes/teachers, frontend already sends `page` and `limit` query params.
