"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  Loader2,
  MessageSquareQuote,
  Megaphone,
  Flag,
  Target,
  UserCheck,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getNotificationPage,
  markAllAsRead,
  markNotificationAsRead,
  type NotificationPageItem,
} from "@/app/actions";
import { formatDateTime, formatRelative } from "@/lib/dates";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

/**
 * One icon per notification type, so the list is scannable by shape as well
 * as by reading every title.
 */
const TYPE_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; className: string; label: string }
> = {
  UPDATE: {
    icon: Megaphone,
    className: "text-muted-foreground",
    label: "Update",
  },
  RESPONSE: {
    icon: MessageSquareQuote,
    className: "text-emerald-600 dark:text-emerald-500",
    label: "Response",
  },
  THRESHOLD: {
    icon: Target,
    className: "text-[#F76902]",
    label: "Threshold",
  },
  REPORT: { icon: Flag, className: "text-destructive", label: "Report" },
  REVIEW: {
    icon: UserCheck,
    className: "text-amber-600 dark:text-amber-500",
    label: "Review",
  },
  SYSTEM: { icon: Info, className: "text-muted-foreground", label: "System" },
};

function metaFor(type: string) {
  return TYPE_META[type] ?? TYPE_META.SYSTEM;
}

export function NotificationsList() {
  const [items, setItems] = useState<NotificationPageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (nextUnreadOnly: boolean) => {
      setLoading(true);
      try {
        const page = await getNotificationPage({
          take: PAGE_SIZE,
          unreadOnly: nextUnreadOnly,
        });
        setItems(page.items);
        setTotal(page.total);
        setUnread(page.unread);
      } catch (error) {
        console.error("Failed to load notifications", error);
        toast.error("Could not load your notifications");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(unreadOnly);
  }, [load, unreadOnly]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const page = await getNotificationPage({
        skip: items.length,
        take: PAGE_SIZE,
        unreadOnly,
      });
      setItems((previous) => [...previous, ...page.items]);
      setTotal(page.total);
      setUnread(page.unread);
    } catch {
      toast.error("Could not load more");
    } finally {
      setLoadingMore(false);
    }
  };

  const markOne = async (id: number) => {
    setItems((previous) =>
      unreadOnly
        ? previous.filter((item) => item.id !== id)
        : previous.map((item) =>
            item.id === id ? { ...item, read: true } : item,
          ),
    );
    setUnread((previous) => Math.max(0, previous - 1));
    try {
      await markNotificationAsRead(id);
    } catch {
      toast.error("Could not mark that as read");
      load(unreadOnly);
    }
  };

  const markAll = async () => {
    setItems((previous) =>
      unreadOnly ? [] : previous.map((item) => ({ ...item, read: true })),
    );
    setUnread(0);
    try {
      await markAllAsRead();
      toast.success("All caught up");
    } catch {
      toast.error("Could not mark everything as read");
      load(unreadOnly);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0
              ? `${unread} unread`
              : "Nothing unread — you're up to date"}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAll}>
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-1 border-b">
        {[
          { key: false, label: "All", count: undefined },
          { key: true, label: "Unread", count: unread },
        ].map((tab) => (
          <button
            key={String(tab.key)}
            type="button"
            onClick={() => setUnreadOnly(tab.key)}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
              unreadOnly === tab.key
                ? "border-[#F76902] font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="rounded-full bg-muted-foreground/15 px-1.5 text-xs tabular-nums">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <Bell className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm font-medium">
            {unreadOnly ? "Nothing unread" : "No notifications yet"}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {unreadOnly
              ? "Everything here has been read."
              : "Updates on petitions you sign or follow will show up here."}
          </p>
        </div>
      ) : (
        <>
          <ul className="divide-y">
            {items.map((item) => {
              const meta = metaFor(item.type);
              const Icon = meta.icon;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "flex gap-3 px-1 py-4",
                    !item.read && "bg-muted/30",
                  )}
                >
                  <span className="mt-0.5 shrink-0">
                    <Icon className={cn("h-4 w-4", meta.className)} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {!item.read && (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F76902]"
                          aria-hidden
                        />
                      )}
                      <p
                        className={cn(
                          "text-sm",
                          item.read ? "font-medium" : "font-semibold",
                        )}
                      >
                        {item.title}
                      </p>
                      <Badge
                        variant="outline"
                        className="h-5 px-1.5 text-[10px] font-normal"
                      >
                        {meta.label}
                      </Badge>
                      {!item.read && <span className="sr-only">Unread</span>}
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.message}
                    </p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <time
                        dateTime={item.createdAt}
                        title={formatDateTime(item.createdAt)}
                        className="text-xs text-muted-foreground"
                      >
                        {formatRelative(item.createdAt)}
                      </time>
                      {item.petition && (
                        <Link
                          href={`/petitions/${item.petition.id}`}
                          onClick={() => !item.read && markOne(item.id)}
                          className="text-xs text-[#F76902] hover:underline"
                        >
                          View petition
                        </Link>
                      )}
                    </div>
                  </div>

                  {!item.read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground"
                      title="Mark as read"
                      aria-label={`Mark "${item.title}" as read`}
                      onClick={() => markOne(item.id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>

          {items.length < total && (
            <div className="pt-4 text-center">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Show older
                <span className="ml-1 text-xs text-muted-foreground">
                  ({total - items.length} more)
                </span>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default NotificationsList;
