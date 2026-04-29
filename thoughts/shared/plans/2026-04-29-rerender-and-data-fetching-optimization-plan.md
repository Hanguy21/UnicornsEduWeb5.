# Rerender And Data Fetching Optimization Plan

## Overview

Plan nay toi uu hanh vi rerender/refetch du thua trong `apps/web` theo huong incremental va an toan (Option A): giu event-driven architecture hien tai, nhung thu hep invalidation scope, giam trigger chong cheo, va chuan hoa query-key patterns de tang tinh du doan va giam chi phi network/render.

## Current State Analysis

Frontend da dung TanStack Query nhat quan cho server state, nhung co nhieu coupling point gay refetch rong va lap:
- Logout trong nhieu shell component dang invalidate toan bo query cache active.
- Calendar pages dang nghe ca global mutation event va custom calendar event, dong thoi bat `refetchOnWindowFocus`.
- Notification flow vua invalidate theo socket push vua co refetch chu dong khi click toast.
- Session bootstrap server-side dang luon `no-store`, khong tan dung fetch cache.
- Mot so context/style object recreation tiep tuc tao pressure rerender khong can thiet.

## Desired End State

Sau khi hoan tat plan, du lieu van cap nhat dung thoi diem theo nghiep vu, nhung bo hanh vi refetch/rerender du thua:
- Logout chi clear/cancel/invalidate theo nhom key can thiet, khong invalidation toan cuc.
- Calendar chi refetch khi co su kien lien quan lich, khong bi anh huong boi mutation khong lien quan.
- Notification tray/socket dong bo qua key co pham vi ro rang, han che refetch lap.
- Query key conventions ro rang, co utility de tai su dung invalidation theo domain.
- Session bootstrap duoc ra quyet dinh ro ve cache strategy theo route/ngu canh.

### Key Discoveries:
- Global logout invalidation xay ra trong `apps/web/components/admin/AdminSidebar.tsx`, `apps/web/components/staff/StaffSidebar.tsx`, `apps/web/components/student/StudentSidebar.tsx`, `apps/web/components/Navbar.tsx`.
- Global mutation event duoc phat tu interceptor tai `apps/web/lib/client.ts` va bridge tai `apps/web/app/providers.tsx`.
- Calendar refetch trigger chong cheo o `apps/web/app/admin/calendar/page.tsx` va `apps/web/app/staff/calendar/page.tsx`.
- Notification tray vua invalidate vua refetch thu cong tai `apps/web/components/shell/SidebarNotificationTray.tsx`, dong thoi co invalidation them tu socket bridge trong `apps/web/app/providers.tsx`.
- Session check server-side dang `cache: "no-store"` tai `apps/web/lib/auth-server.ts`.

## What We're NOT Doing

- Khong thay doi API contract backend hoac schema database.
- Khong thay doi UX/chuc nang nghiep vu cua logout, calendar, notification.
- Khong chuyen doi lon sang kien truc moi (khong remove toan bo event bus trong dot nay).
- Khong optimize moi component frontend; chi focus nhom file anh huong truc tiep.

## Implementation Approach

Ap dung Option A theo tung phase nho:
1. Chuan hoa query keys + helper invalidation de giam duplicate logic.
2. Refactor logout va calendar trigger de loai bo invalidation/refetch du thua.
3. Tinh gon notification data-sync flow.
4. Ra soat cac diem rerender can bo sung memoization/object stability.
5. Verify bang typecheck/lint/manual scenario de dam bao khong hoi quy.

## Phase 1: Query Key And Invalidation Foundation

### Overview
Tao nen tang chuan hoa query key/invalidation theo domain de cac phase sau refactor an toan va nhat quan.

### Changes Required:

#### 1. Add shared query key factories and scoped invalidation helpers
**File**: `apps/web/lib/query-keys.ts` (new)  
**Changes**:
- Dinh nghia key factories cho `auth`, `calendar`, `staffCalendar`, `notifications`, `actionHistory`.
- Expose helper tao filter-key on dinh (tranh object shape drift lam vo hieu cache).

```typescript
export const authKeys = {
  all: ["auth"] as const,
  session: () => [...authKeys.all, "session"] as const,
  fullProfile: () => [...authKeys.all, "full-profile"] as const,
};
```

#### 2. Reuse notification query key factory
**File**: `apps/web/lib/notification-feed-query.ts`  
**Changes**:
- Chuyen sang export theo factory de dung chung voi `providers` va `SidebarNotificationTray`.
- Giu backward compatibility cho call sites theo cach migrate tung buoc.

#### 3. Prepare scoped invalidation utility
**File**: `apps/web/lib/query-invalidation.ts` (new)  
**Changes**:
- Helper cho logout cleanup, calendar-specific invalidation, notification invalidation.
- Tach ro cancel/remove/invalidate theo use case.

```typescript
export async function clearSessionScopedQueries(queryClient: QueryClient) {
  await queryClient.cancelQueries({ queryKey: authKeys.all });
  queryClient.removeQueries({ queryKey: authKeys.all });
}
```

### Success Criteria:

#### Automated Verification:
- [x] Web typecheck pass: `pnpm --filter web exec tsc --noEmit`
- [ ] Web lint pass (khong them warning moi): `pnpm --filter web lint`
- [ ] Khong co import cycle moi trong `apps/web/lib/*`

#### Manual Verification:
- [ ] Khong thay doi hanh vi UI khi chua bat dau refactor runtime flow.
- [ ] Query data van hien thi dung tren admin/staff/student shell.

**Implementation Note**: Sau phase nay, tam dung de xac nhan voi nguoi review rang naming va query-key conventions phu hop truoc khi tiep tuc.

---

## Phase 2: Logout And Calendar Refetch De-duplication

### Overview
Loai bo invalidation qua rong trong logout va giam trigger refetch trung lap o 2 calendar pages.

### Changes Required:

#### 1. Replace global logout invalidation in shell/navbar
**File**: `apps/web/components/admin/AdminSidebar.tsx`  
**File**: `apps/web/components/staff/StaffSidebar.tsx`  
**File**: `apps/web/components/student/StudentSidebar.tsx`  
**File**: `apps/web/components/Navbar.tsx`  
**Changes**:
- Thay `queryClient.invalidateQueries()` bang helper scoped cleanup.
- Dam bao van reset auth context + redirect nhu cu.

```typescript
onSuccess: async () => {
  await clearSessionScopedQueries(queryClient);
  setUser(createGuestUser());
  router.push("/");
}
```

#### 2. Scope calendar invalidation events
**File**: `apps/web/lib/client.ts`  
**File**: `apps/web/app/admin/calendar/page.tsx`  
**File**: `apps/web/app/staff/calendar/page.tsx`  
**Changes**:
- Khong de calendar nghe global action-history invalidation event nua.
- Chi nghe event calendar-specific hoac key-scoped invalidation.
- Danh gia tat `refetchOnWindowFocus` hoac giu theo policy moi (uu tien tat neu da co event-driven refresh on mutate).

```typescript
window.addEventListener("calendar:refetch", handleCalendarInvalidate);
// remove ACTION_HISTORY_INVALIDATION_EVENT listener from calendar pages
```

#### 3. Keep action-history bridge isolated
**File**: `apps/web/app/providers.tsx`  
**Changes**:
- Giu bridge `["action-history"]` nhung dam bao khong vo tinh tac dong domain calendar.

### Success Criteria:

#### Automated Verification:
- [x] Web typecheck pass: `pnpm --filter web exec tsc --noEmit`
- [ ] Web lint pass: `pnpm --filter web lint`
- [x] Calendar pages build khong error import/type

#### Manual Verification:
- [ ] Dang xuat tu navbar/admin/staff/student thanh cong, khong thay burst request bat thuong.
- [ ] Admin calendar va staff calendar van cap nhat khi mutate lich lien quan.
- [ ] Mutation khong lien quan lich (vd: flow khac) khong con trigger refetch calendar.
- [ ] Chuyen tab trinh duyet/focus lai khong tao refetch lap neu khong can.

**Implementation Note**: Sau phase nay can manual check request waterfall (DevTools) de xac nhan so lan goi API giam nhu ky vong.

---

## Phase 3: Notification Flow Optimization

### Overview
Giam double-refresh trong notification tray/socket while preserving realtime behavior.

### Changes Required:

#### 1. Unify notification invalidation key usage
**File**: `apps/web/app/providers.tsx`  
**File**: `apps/web/components/shell/SidebarNotificationTray.tsx`  
**Changes**:
- Dung cung key factory/root key cho invalidate va optimistic update.
- Tranh invalidate trung lap khong can thiet khi da co optimistic patch.

#### 2. Reduce explicit `refetch()` in toast-open path
**File**: `apps/web/components/shell/SidebarNotificationTray.tsx`  
**Changes**:
- Uu tien doc tu cache + set ephemeral detail.
- Chi refetch co dieu kien (nhu stale qua nguong) thay vi luon refetch khi miss.

```typescript
if (!existing && shouldRefetchForFreshness(feedQuery.dataUpdatedAt)) {
  await feedQuery.refetch();
}
```

#### 3. Keep mark-read mutation efficient
**File**: `apps/web/components/shell/SidebarNotificationTray.tsx`  
**Changes**:
- Xem xet onSettled invalidation theo dieu kien (chi invalidate khi rollback/unknown state), khong bat buoc moi lan.

### Success Criteria:

#### Automated Verification:
- [x] Web typecheck pass: `pnpm --filter web exec tsc --noEmit`
- [ ] Web lint pass: `pnpm --filter web lint`
- [x] Notification tray khong co ESLint/react-hooks warning moi

#### Manual Verification:
- [ ] Nhan notification realtime van hien toast va mo detail dung item.
- [ ] Mark read cap nhat UI ngay, khong flicker list.
- [ ] So request notification feed giam trong luong "toast click -> open detail".

**Implementation Note**: Sau phase nay, can test ca vai tro admin/staff/student de dam bao parity behavior.

---

## Phase 4: Session Bootstrap And Rerender Hygiene

### Overview
Hoan thien cac diem con lai lien quan session fetch strategy va object recreation co tac dong rong.

### Changes Required:

#### 1. Re-evaluate auth session fetch caching policy
**File**: `apps/web/lib/auth-server.ts`  
**File**: `apps/web/app/layout.tsx`  
**File**: `apps/web/proxy.ts`  
**Changes**:
- Chon chinh sach cache explicit theo yeu cau auth correctness (co the van `no-store` neu bat buoc), nhung document ro ly do.
- Neu co the, tranh goi trung lap session check tren cung luong request.

#### 2. Stabilize hot path provider/context values where needed
**File**: `apps/web/components/ui/chart.tsx`  
**File**: `apps/web/app/staff/layout.tsx`  
**File**: `apps/web/app/student/layout.tsx`  
**Changes**:
- Memoize provider value object tai chart container.
- Trich static style object constant cho decorative backgrounds trong client layouts.

```typescript
const contextValue = React.useMemo(() => ({ config }), [config]);
<ChartContext.Provider value={contextValue}>
```

### Success Criteria:

#### Automated Verification:
- [x] Web typecheck pass: `pnpm --filter web exec tsc --noEmit`
- [ ] Web lint pass: `pnpm --filter web lint`
- [x] Khong co regression trong providers/layout compile path

#### Manual Verification:
- [ ] Hanh vi dang nhap/redirect/auth gate van dung.
- [ ] Khong co regression visual o chart/layout shells (admin/staff/student).
- [ ] Tuong tac UI shell (collapse/open) muot, khong thay re-render spike bat thuong trong React Profiler basic check.

**Implementation Note**: Sau phase nay moi chot implementation va chuyen sang regression sweep tong.

---

## Testing Strategy

### Unit Tests:
- Bo sung test cho utility query keys/invalidation helper (`apps/web/lib/*`).
- Test logic conditional refetch trong notification tray helper (neu tach helper function).

### Integration Tests:
- Scenario logout tu cac shell khac nhau, verify auth state reset + query cleanup.
- Scenario calendar mutate va non-calendar mutate de xac nhan chi calendar mutation moi trigger calendar refresh.
- Scenario notification pushed -> toast -> open detail -> mark read.

### Manual Testing Steps:
1. Dang nhap role admin/staff/student, mo DevTools Network.
2. Kich hoat logout o tung shell, so sanh request count truoc/sau refactor.
3. Tai admin/staff calendar, thuc hien mutation lien quan lich va mutation khong lien quan, quan sat refetch behavior.
4. Gui notification realtime, click toast mo detail, quan sat request feed + UX.
5. Chuyen focus tab/browser de xac nhan khong refetch trung lap ngoai ky vong.

## Performance Considerations

- Muc tieu giam request burst va render churn ma khong hy sinh fresh data cho user.
- Tranh over-optimization som: tap trung vao blast-radius points co tac dong rong nhat (logout, calendar, notification bridge).
- Do luong lai bang browser network logs + React Profiler basic session.

## Migration Notes

- Refactor theo phase nho, merge tung phan de de rollback.
- Trong Phase 2 va Phase 3, co the dung feature flag nhe (const toggle local) neu can rollout an toan.
- Neu thay doi chinh sach session fetch cache, can review ky cac route auth-sensitive truoc khi rollout.

## References

- Original research: `thoughts/shared/research/2026-04-29-rerender-and-data-fetching-patterns.md`
- Related implementation points:
  - `apps/web/lib/client.ts`
  - `apps/web/app/providers.tsx`
  - `apps/web/app/admin/calendar/page.tsx`
  - `apps/web/app/staff/calendar/page.tsx`
  - `apps/web/components/shell/SidebarNotificationTray.tsx`
  - `apps/web/components/admin/AdminSidebar.tsx`
  - `apps/web/components/staff/StaffSidebar.tsx`
  - `apps/web/components/student/StudentSidebar.tsx`
  - `apps/web/components/Navbar.tsx`
  - `apps/web/lib/auth-server.ts`
  - `apps/web/components/ui/chart.tsx`
