"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, Bell, Check, CheckCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getUserNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllAsRead,
} from "@/app/actions";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: Date;
  petitionId: number | null;
  petition: {
    id: number;
    title: string;
  } | null;
}

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Source - https://stackoverflow.com/a
  // Posted by Stas, modified by community. See post 'Timeline' for change history
  // Retrieved 2026-01-13, License - CC BY-SA 4.0
  // Source - https://stackoverflow.com/a
  // Posted by Md Abdul Shahed, modified by community. See post 'Timeline' for change history
  // Retrieved 2026-01-13, License - CC BY-SA 4.0
  function timeAgo(input: Date) {
    const date = input instanceof Date ? input : new Date(input);
    const formatter = new Intl.RelativeTimeFormat("en");
    const ranges = [
      ["years", 3600 * 24 * 365],
      ["months", 3600 * 24 * 30],
      ["weeks", 3600 * 24 * 7],
      ["days", 3600 * 24],
      ["hours", 3600],
      ["minutes", 60],
      ["seconds", 1],
    ] as const;
    const secondsElapsed = (date.getTime() - Date.now()) / 1000;

    for (const [rangeType, rangeVal] of ranges) {
      if (rangeVal < Math.abs(secondsElapsed)) {
        const delta = secondsElapsed / rangeVal;
        return formatter.format(Math.round(delta), rangeType);
      }
    }
  }

  const fetchNotifications = async () => {
    try {
      const notifs = await getUserNotifications();
      setNotifications(notifs);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  const fetchCount = async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to fetch count", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchCount();

    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      fetchCount();
    }
  }, [isOpen]);

  const handleMarkAsRead = async (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    await markNotificationAsRead(id);
    fetchNotifications();
    fetchCount();
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    await markAllAsRead();
    fetchNotifications();
    fetchCount();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-white hover:bg-white/20 hover:text-white"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 border-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold leading-none">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                handleMarkAllAsRead();
              }}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground p-4 text-center">
              <Bell className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex flex-col gap-1 p-4 border-b hover:bg-muted/50 transition-colors relative group",
                    !notification.read && "bg-muted/20",
                  )}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                        )}
                        <p
                          className={cn(
                            "text-sm font-medium leading-none",
                            !notification.read && "text-primary font-bold",
                          )}
                        >
                          {notification.title}
                        </p>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      {notification.petition && (
                        <Link
                          href={`/petitions/${notification.petition.id}`}
                          className="text-xs text-primary hover:underline inline-block mt-1"
                          onClick={() => {
                            if (!notification.read) {
                              handleMarkAsRead(notification.id);
                            }
                            setIsOpen(false);
                          }}
                        >
                          View Petition
                        </Link>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {timeAgo(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.read && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.preventDefault();
                          handleMarkAsRead(notification.id);
                        }}
                        title="Mark as read"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="border-t p-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full justify-center text-sm"
          >
            <Link href="/notifications" onClick={() => setIsOpen(false)}>
              View all notifications
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
