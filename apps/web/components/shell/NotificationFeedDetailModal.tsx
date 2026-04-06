"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { NotificationFeedItem } from "@/dtos/notification.dto";
import {
  formatSidebarNotificationTime,
} from "@/lib/format-sidebar-notification-time";

export function NotificationFeedDetailModal({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: NotificationFeedItem | null;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();

  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <AnimatePresence>
      {open && item ? (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="fixed inset-0 z-[120] bg-black/50"
            aria-label="Đóng chi tiết thông báo"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[121] flex items-center justify-center p-3 sm:p-4 pointer-events-none">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="notif-detail-title"
              initial={
                reduceMotion
                  ? false
                  : { opacity: 0, scale: 0.94, y: 16 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={
                reduceMotion
                  ? undefined
                  : { opacity: 0, scale: 0.96, y: 10 }
              }
              transition={transition}
              className="pointer-events-auto flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-2xl"
            >
              <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border-default px-4 py-3">
                <h2
                  id="notif-detail-title"
                  className="text-base font-semibold leading-snug text-text-primary"
                >
                  {item.title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  aria-label="Đóng"
                >
                  <span aria-hidden className="text-xl leading-none">
                    ×
                  </span>
                </button>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
                <p className="text-xs text-text-muted">
                  {formatSidebarNotificationTime(item.lastPushedAt)}
                </p>
                <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                  {item.message}
                </div>
              </div>
              <footer className="shrink-0 border-t border-border-default p-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-border-default bg-bg-surface px-4 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:w-auto"
                >
                  Quay lại danh sách
                </button>
              </footer>
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
