"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { formatRelativeTime } from "@/lib/time";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/app/notifications/actions";
import type { Notification } from "@/app/notifications/actions";

const hideOnRoutes = ["/login", "/verify", "/onboarding", "/settings"];

export default function TopBarIcons() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count on mount
  useEffect(() => {
    getUnreadCount().then(setUnreadCount);
  }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggleDropdown = useCallback(async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    const data = await getNotifications();
    setNotifications(data);
    setLoading(false);
  }, [open]);

  async function handleNotificationClick(n: Notification) {
    if (!n.is_read) {
      await markNotificationRead(n.id);
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
      );
    }
    setOpen(false);
    router.push(`/post/${n.post_id}`);
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  if (hideOnRoutes.some((route) => pathname.startsWith(route))) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2" ref={dropdownRef}>
      {/* Bell icon */}
      <button
        onClick={toggleDropdown}
        className="relative rounded-full bg-white/80 p-2 text-zinc-500 shadow-sm backdrop-blur-sm transition-all duration-150 hover:text-zinc-800 active:scale-[0.90] dark:bg-zinc-900/80 dark:text-zinc-400 dark:hover:text-zinc-100"
        aria-label="Notifications"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Gear icon */}
      <Link
        href="/settings"
        className="rounded-full bg-white/80 p-2 text-zinc-500 shadow-sm backdrop-blur-sm transition-all duration-150 hover:text-zinc-800 active:scale-[0.90] dark:bg-zinc-900/80 dark:text-zinc-400 dark:hover:text-zinc-100"
        aria-label="Settings"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </Link>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-12 right-0 w-80 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex flex-col gap-1 p-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse rounded-lg p-3">
                    <div className="mb-2 h-3 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
                    <div className="h-2.5 w-1/2 rounded bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
                No notifications yet
              </p>
            ) : (
              <div className="flex flex-col">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-zinc-800 dark:active:bg-zinc-750"
                  >
                    <span className="mt-0.5 shrink-0">
                      <NotificationIcon type={n.type} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        <NotificationMessage type={n.type} actorHandle={n.actor_handle} postSubject={n.post_subject} />
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                        {formatRelativeTime(n.created_at)}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationIcon({ type }: { type: string }) {
  const className = "h-4 w-4 text-zinc-400 dark:text-zinc-500";

  if (type === "new_post") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    );
  }

  if (type === "new_comment") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    );
  }

  if (type === "new_like") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    );
  }

  // Default bell for unknown types
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function NotificationMessage({
  type,
  actorHandle,
  postSubject,
}: {
  type: string;
  actorHandle: string | null;
  postSubject: string;
}) {
  const actor = actorHandle ? (
    <span className="font-medium text-zinc-900 dark:text-zinc-100">@{actorHandle}</span>
  ) : (
    <span className="font-medium text-zinc-900 dark:text-zinc-100">Someone</span>
  );

  const subject = postSubject.length > 40 ? postSubject.slice(0, 40) + "..." : postSubject;

  if (type === "new_post") {
    return (
      <>
        {actor} posted about you: &ldquo;{subject}&rdquo;
      </>
    );
  }

  if (type === "new_comment") {
    return (
      <>
        {actor} commented on your post: &ldquo;{subject}&rdquo;
      </>
    );
  }

  if (type === "new_like") {
    return (
      <>
        {actor} liked your post: &ldquo;{subject}&rdquo;
      </>
    );
  }

  return (
    <>
      {actor} interacted with your post: &ldquo;{subject}&rdquo;
    </>
  );
}
