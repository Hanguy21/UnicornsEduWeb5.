import { notificationsKeys } from "@/lib/query-keys";

export const notificationFeedQueryKey = (limit = 80) =>
  notificationsKeys.feed({ limit });

// Backward-compatible export for existing call sites.
export const NOTIFICATION_FEED_QUERY_KEY = notificationsKeys.feed();
